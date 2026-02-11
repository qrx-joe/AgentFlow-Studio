import request from './request'

// 工作流 API
export const workflowApi = {
  list: () => request.get('/workflows'),
  get: (id: string) => request.get(`/workflows/${id}`),
  create: (payload: any) => request.post('/workflows', payload),
  update: (id: string, payload: any) => request.put(`/workflows/${id}`, payload),
  remove: (id: string) => request.delete(`/workflows/${id}`),
  execute: (id: string, input?: string) => request.post(`/workflows/${id}/execute`, { input }),
  listExecutions: (id: string) => request.get(`/workflows/${id}/executions`),
}

// 知识库 API
export const knowledgeApi = {
  list: () => request.get('/knowledge/documents'),
  upload: (file: File, options?: { chunkSize?: number; overlap?: number }) => {
    const formData = new FormData()
    formData.append('file', file)
    if (options?.chunkSize !== undefined) {
      formData.append('chunkSize', String(options.chunkSize))
    }
    if (options?.overlap !== undefined) {
      formData.append('overlap', String(options.overlap))
    }
    return request.post('/knowledge/upload', formData)
  },
  remove: (id: string) => request.delete(`/knowledge/documents/${id}`),
  search: (
    query: string,
    topK: number,
    options?: {
      scoreThreshold?: number
      hybrid?: boolean
      rerank?: boolean
      vectorWeight?: number
      keywordWeight?: number
      keywordMode?: 'bm25' | 'tsrank' | 'trgm'
    }
  ) => request.post('/knowledge/search', { query, topK, ...options }),
  eval: (payload: {
    queries: Array<{ query: string; expectedDocumentIds: string[] }>
    topK?: number
    baseline?: {
      scoreThreshold?: number
      hybrid?: boolean
      rerank?: boolean
      vectorWeight?: number
      keywordWeight?: number
      keywordMode?: 'bm25' | 'tsrank' | 'trgm'
    }
    compare?: {
      scoreThreshold?: number
      hybrid?: boolean
      rerank?: boolean
      vectorWeight?: number
      keywordWeight?: number
      keywordMode?: 'bm25' | 'tsrank' | 'trgm'
    }
  }) => request.post('/knowledge/eval', payload),
  listChunks: (id: string, limit: number = 5) =>
    request.get(`/knowledge/documents/${id}/chunks`, { params: { limit } }),
}

// 监控 API
export const metricsApi = {
  summary: (days: number = 7, thresholds?: { failureRate?: number; cacheHitRate?: number }) =>
    request.get('/metrics/summary', { params: { days, ...thresholds } }),
}

// 对话 API
export const chatApi = {
  listSessions: () => request.get('/chat/sessions'),
  createSession: () => request.post('/chat/sessions'),
  listMessages: (sessionId: string) => request.get(`/chat/sessions/${sessionId}/messages`),
  sendMessage: (payload: { sessionId: string; content: string }) => request.post('/chat/messages', payload),
  removeSession: (id: string) => request.delete(`/chat/sessions/${id}`),
}
