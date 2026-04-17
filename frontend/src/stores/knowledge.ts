import { defineStore } from 'pinia';
import { knowledgeApi } from '@/api';
import type { DocumentItem, SearchResult } from '@/types';

// 分块设置
export interface ChunkSettings {
  method: 'auto' | 'custom';
  chunkSize: number;
  overlap: number;
  separators?: string[];
}

// 检索设置
export interface RetrievalSettings {
  mode: 'vector' | 'fulltext' | 'hybrid';
  topK: number;
  scoreThreshold: number;
  rerank: boolean;
  rerankModel?: string;
  vectorWeight?: number;
  keywordWeight?: number;
}

// 知识库设置
export interface KnowledgeBaseSettings {
  embeddingModel?: string;
  chunk: ChunkSettings;
  retrieval: RetrievalSettings;
}

// 知识库
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  settings: KnowledgeBaseSettings;
  documentCount?: number;
  chunkCount?: number;
  totalChars?: number;
  createdAt?: string;
  updatedAt?: string;
}

// 默认设置
export const defaultSettings: KnowledgeBaseSettings = {
  embeddingModel: 'bge-m3',
  chunk: {
    method: 'auto',
    chunkSize: 500,
    overlap: 50,
  },
  retrieval: {
    mode: 'hybrid',
    topK: 5,
    scoreThreshold: 0.01,
    rerank: false,
    vectorWeight: 1,
    keywordWeight: 0.5,
  },
};

// 知识库状态管理
export const useKnowledgeStore = defineStore('knowledge', {
  state: () => ({
    // 知识库
    knowledgeBases: [] as KnowledgeBase[],
    currentKnowledgeBase: null as KnowledgeBase | null,
    loadingBases: false,

    // 文档
    documents: [] as DocumentItem[],
    loading: false,
    uploading: false,

    // 检索
    searchResults: [] as SearchResult[],
    searching: false,
    searchStats: { total: 0, filtered: 0 },

    // 文档分块
    documentChunks: [] as Array<{ id: string; content: string; chunkIndex: number }>,
    chunkLoading: false,
  }),

  actions: {
    // ========== 知识库管理 ==========

    async fetchKnowledgeBases() {
      this.loadingBases = true;
      try {
        const response = await knowledgeApi.listBases();
        this.knowledgeBases = response;
      } finally {
        this.loadingBases = false;
      }
    },

    async fetchKnowledgeBase(id: string) {
      const response = await knowledgeApi.getBase(id);
      this.currentKnowledgeBase = response;
      return response;
    },

    async createKnowledgeBase(data: {
      name: string;
      description?: string;
      icon?: string;
      color?: string;
    }) {
      const kb = await knowledgeApi.createBase(data);
      this.knowledgeBases.unshift(kb);
      return kb;
    },

    async updateKnowledgeBase(
      id: string,
      data: {
        name?: string;
        description?: string;
        icon?: string;
        color?: string;
        settings?: Partial<KnowledgeBaseSettings>;
      },
    ) {
      const kb = await knowledgeApi.updateBase(id, data);
      const index = this.knowledgeBases.findIndex((item) => item.id === id);
      if (index !== -1 && kb) {
        this.knowledgeBases[index] = kb;
      }
      if (this.currentKnowledgeBase?.id === id) {
        this.currentKnowledgeBase = kb;
      }
      return kb;
    },

    async deleteKnowledgeBase(id: string) {
      await knowledgeApi.deleteBase(id);
      this.knowledgeBases = this.knowledgeBases.filter((kb) => kb.id !== id);
      if (this.currentKnowledgeBase?.id === id) {
        this.currentKnowledgeBase = null;
      }
    },

    // ========== 文档管理 ==========

    async fetchDocuments(knowledgeBaseId?: string) {
      this.loading = true;
      try {
        const response = await knowledgeApi.list(knowledgeBaseId);
        this.documents = response;
      } finally {
        this.loading = false;
      }
    },

    async uploadDocument(
      file: File,
      knowledgeBaseId: string,
      options?: { chunkSize?: number; overlap?: number },
    ) {
      this.uploading = true;
      try {
        await knowledgeApi.upload(file, {
          ...options,
          knowledgeBaseId,
        });
        await this.fetchDocuments(knowledgeBaseId);
        // 刷新当前知识库信息
        if (this.currentKnowledgeBase?.id === knowledgeBaseId) {
          await this.fetchKnowledgeBase(knowledgeBaseId);
        }
        // 刷新列表中的统计
        await this.fetchKnowledgeBases();
      } finally {
        this.uploading = false;
      }
    },

    async deleteDocument(id: string, knowledgeBaseId?: string) {
      await knowledgeApi.remove(id);
      if (knowledgeBaseId) {
        await this.fetchDocuments(knowledgeBaseId);
        if (this.currentKnowledgeBase?.id === knowledgeBaseId) {
          await this.fetchKnowledgeBase(knowledgeBaseId);
        }
        await this.fetchKnowledgeBases();
      }
    },

    // ========== 检索 ==========

    async search(
      query: string,
      topK: number,
      options?: {
        scoreThreshold?: number;
        hybrid?: boolean;
        rerank?: boolean;
        vectorWeight?: number;
        keywordWeight?: number;
        keywordMode?: 'bm25' | 'tsrank' | 'trgm';
        knowledgeBaseId?: string;
      },
    ) {
      this.searching = true;
      try {
        const response = await knowledgeApi.search(query, topK, options);
        this.searchResults = response.results || [];
        this.searchStats = {
          total: response.total || 0,
          filtered: response.filtered || 0,
        };
      } finally {
        this.searching = false;
      }
    },

    clearSearch() {
      this.searchResults = [];
      this.searchStats = { total: 0, filtered: 0 };
    },

    async fetchDocumentChunks(id: string, limit: number = 5) {
      this.chunkLoading = true;
      try {
        const response = await knowledgeApi.listChunks(id, limit);
        this.documentChunks = response;
      } finally {
        this.chunkLoading = false;
      }
    },
  },
});
