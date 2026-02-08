import { defineStore } from 'pinia'
import { knowledgeApi } from '@/api'
import type { DocumentItem, SearchResult } from '@/types'

// 知识库状态管理：文档列表、上传与检索
export const useKnowledgeStore = defineStore('knowledge', {
  state: () => ({
    documents: [] as DocumentItem[],
    searchResults: [] as SearchResult[],
    loading: false,
    uploading: false,
    searching: false,
    searchStats: { total: 0, filtered: 0 },
  }),

  actions: {
    async fetchDocuments() {
      this.loading = true
      try {
        const response = await knowledgeApi.list()
        this.documents = response
      } finally {
        this.loading = false
      }
    },

    async uploadDocument(file: File, options?: { chunkSize?: number; overlap?: number }) {
      this.uploading = true
      try {
        await knowledgeApi.upload(file, options)
        await this.fetchDocuments()
      } finally {
        this.uploading = false
      }
    },

    async deleteDocument(id: string) {
      await knowledgeApi.remove(id)
      await this.fetchDocuments()
    },

    async search(
      query: string,
      topK: number,
      options?: { scoreThreshold?: number; hybrid?: boolean; rerank?: boolean }
    ) {
      this.searching = true
      try {
        const response = await knowledgeApi.search(query, topK, options)
        this.searchResults = response.results || []
        this.searchStats = {
          total: response.total || 0,
          filtered: response.filtered || 0,
        }
      } finally {
        this.searching = false
      }
    },

    clearSearch() {
      this.searchResults = []
      this.searchStats = { total: 0, filtered: 0 }
    },
  },
})
