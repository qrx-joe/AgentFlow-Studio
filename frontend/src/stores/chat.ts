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
        const response = await chatApi.sendMessage({
          sessionId: this.currentSessionId,
          content,
        })

        // 添加助手消息与溯源信息
        this.messages.push(response)
        return response
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
