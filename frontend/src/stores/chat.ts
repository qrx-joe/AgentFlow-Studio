import { defineStore } from 'pinia'
import { chatApi } from '@/api'
import type { Message, Session } from '@/types'

// 对话状态管理：会话列表、消息收发与溯源展示
export const useChatStore = defineStore('chat', {
  state: () => ({
    sessions: [] as Session[],
    currentSessionId: '' as string,
    messages: [] as Message[],
    loading: false,
    streaming: false,
    abortController: null as AbortController | null,
  }),

  getters: {
    currentSession: (state) => state.sessions.find(s => s.id === state.currentSessionId),
  },

  actions: {
    async fetchSessions() {
      const response = await chatApi.listSessions()
      this.sessions = response
    },

    async createSession() {
      const response = await chatApi.createSession()
      this.sessions.unshift(response)
      this.currentSessionId = response.id
      this.messages = []
      return response
    },

    async selectSession(id: string) {
      this.currentSessionId = id
      await this.fetchMessages(id)
    },

    async fetchMessages(sessionId: string) {
      const response = await chatApi.listMessages(sessionId)
      this.messages = response
    },

    async sendMessage(content: string) {
      if (!this.currentSessionId) {
        await this.createSession()
      }

      const isFirstMessage = this.messages.length === 0

      // 先插入用户消息，提升交互体验
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      }
      this.messages.push(userMessage)

      this.loading = true
      this.streaming = true
      this.abortController = new AbortController()

      // 先插入一个空的助手消息，用于流式展示
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        sources: [],
        createdAt: new Date().toISOString(),
      }
      this.messages.push(assistantMessage)

      try {
        // 使用后端 SSE 流式接口
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
        const streamUrl = `${baseUrl}/chat/messages/stream`
        const token = localStorage.getItem('token')
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        const response = await fetch(streamUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ sessionId: this.currentSessionId, content }),
          signal: this.abortController.signal,
        })

        // 检查 HTTP 状态码
        if (!response.ok) {
          let errorMsg = `请求失败 (${response.status})`
          try {
            const errorBody = await response.json()
            errorMsg = errorBody.message || errorMsg
          } catch {
            // 无法解析错误体，使用默认消息
          }
          // 回退到非流式接口
          const msgIndex = this.messages.length - 1
          try {
            const fallback = await chatApi.sendMessage({
              sessionId: this.currentSessionId,
              content,
            })
            this.messages[msgIndex].content = fallback.content || errorMsg
            this.messages[msgIndex].sources = fallback.sources || []
          } catch {
            this.messages[msgIndex].content = `⚠️ ${errorMsg}`
          }
          return this.messages[msgIndex]
        }

        if (!response.body) {
          // 回退到非流式接口
          const msgIndex = this.messages.length - 1
          try {
            const fallback = await chatApi.sendMessage({
              sessionId: this.currentSessionId,
              content,
            })
            this.messages[msgIndex].content = fallback.content || ''
            this.messages[msgIndex].sources = fallback.sources || []
          } catch (e: any) {
            this.messages[msgIndex].content = `⚠️ 无法获取回复：${e.message || '未知错误'}`
          }
          return this.messages[msgIndex]
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''

        // 获取助手消息在数组中的索引，用于响应式更新
        const assistantIndex = this.messages.length - 1

        // 读取 SSE 数据块
        console.log('[Chat] Starting SSE stream...')
        let tokenCount = 0
        while (true) {
          const { value, done } = await reader.read()
          if (done) {
            console.log(`[Chat] Stream ended. Total tokens: ${tokenCount}`)
            break
          }
          buffer += decoder.decode(value, { stream: true })
          buffer = buffer.replace(/\r\n/g, '\n')

          // 按 SSE 事件分割
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''

          for (const part of parts) {
            const lines = part.split('\n').filter(Boolean)
            let eventType = 'message'
            const dataLines: string[] = []

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.slice(6).trim() || 'message'
              } else if (line.startsWith('data:')) {
                // 使用 slice 而非 replace，避免误替换内容中的 'data:'
                dataLines.push(line.slice(5).trimStart())
              }
              // 忽略注释行（以 : 开头）和其他行
            }

            if (!dataLines.length) {
              continue
            }

            const dataText = dataLines.join('\n')
            if (eventType === 'error') {
              try {
                const payload = JSON.parse(dataText)
                this.messages[assistantIndex].content += payload.message || '服务器内部错误'
                console.error('[Chat] SSE error:', payload.message)
              } catch {
                this.messages[assistantIndex].content += '服务器内部错误'
              }
              continue
            }

            if (eventType === 'done') {
              try {
                const payload = JSON.parse(dataText)
                this.messages[assistantIndex].sources = payload.sources || []
                console.log('[Chat] Stream done, sources:', payload.sources?.length || 0)
              } catch {
                // 解析失败，忽略
              }
              continue
            }

            // 通过数组索引更新，确保触发 Vue 响应式
            this.messages[assistantIndex].content += dataText
            tokenCount++
            if (tokenCount % 10 === 0) {
              console.log(`[Chat] Received ${tokenCount} tokens, current length: ${this.messages[assistantIndex].content.length}`)
            }
          }
        }

        // 如果流结束后内容仍为空，尝试非流式接口
        if (!this.messages[assistantIndex].content.trim()) {
          try {
            const fallback = await chatApi.sendMessage({
              sessionId: this.currentSessionId,
              content,
            })
            this.messages[assistantIndex].content = fallback.content || '⚠️ AI 未返回内容'
            this.messages[assistantIndex].sources = fallback.sources || []
          } catch {
            this.messages[assistantIndex].content = '⚠️ AI 未返回内容，请检查后端日志'
          }
        }

        // 如果是第一条消息，延迟刷新会话列表以获取 AI 生成的标题
        if (isFirstMessage) {
          setTimeout(() => {
            this.fetchSessions().catch(err => {
              console.warn('[Chat] Failed to refresh sessions after title generation:', err)
            })
          }, 2000)
        }

        return this.messages[assistantIndex]
      } catch (e: any) {
        if (e.name === 'AbortError') {
          this.messages[this.messages.length - 1].content += '\n\n_(已停止生成)_'
        } else {
          this.messages[this.messages.length - 1].content = `⚠️ 发送失败：${e.message || '未知错误'}`
          console.error('[Chat] sendMessage error:', e)
        }
        return this.messages[this.messages.length - 1]
      } finally {
        this.loading = false
        this.streaming = false
        this.abortController = null
      }
    },

    // 中断流式输出
    abortStreaming() {
      if (this.abortController) {
        this.abortController.abort()
        this.abortController = null
      }
      this.streaming = false
      this.loading = false
    },

    async deleteSession(id: string) {
      await chatApi.removeSession(id)
      this.sessions = this.sessions.filter(s => s.id !== id)
      if (this.currentSessionId === id) {
        this.currentSessionId = ''
        this.messages = []
      }
    },
  },
})
