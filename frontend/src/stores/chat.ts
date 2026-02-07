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

      // 先插入用户消息，提升交互体验
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      }
      this.messages.push(userMessage)

      this.loading = true
      try {
        // 先插入一个空的助手消息，用于流式展示
        const assistantMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: '',
          sources: [],
          createdAt: new Date().toISOString(),
        }
        this.messages.push(assistantMessage)

        // 使用后端 SSE 流式接口
        const response = await fetch('/api/chat/messages/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.currentSessionId, content }),
        })

        if (!response.body) {
          // 回退到非流式接口
          const fallback = await chatApi.sendMessage({
            sessionId: this.currentSessionId,
            content,
          })
          assistantMessage.content = fallback.content || ''
          assistantMessage.sources = fallback.sources || []
          return fallback
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''

        // 读取 SSE 数据块
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // 按 SSE 事件分割
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''

          for (const part of parts) {
            if (part.startsWith('event: done')) {
              const dataLine = part.split('\n').find(line => line.startsWith('data: '))
              if (dataLine) {
                const payload = JSON.parse(dataLine.replace('data: ', ''))
                assistantMessage.sources = payload.sources || []
              }
            } else if (part.startsWith('data: ')) {
              const token = part.replace('data: ', '')
              assistantMessage.content += token
            }
          }
        }

        return assistantMessage
      } finally {
        this.loading = false
      }
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
