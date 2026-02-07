import request from './request'

// 工作流 API
export const workflowApi = {
  list: () => request.get('/workflows'),
  get: (id: string) => request.get(`/workflows/${id}`),
  create: (payload: any) => request.post('/workflows', payload),
  update: (id: string, payload: any) => request.put(`/workflows/${id}`, payload),
  remove: (id: string) => request.delete(`/workflows/${id}`),
  execute: (id: string, input?: string) => request.post(`/workflows/${id}/execute`, { input }),
}

// 知识库 API
export const knowledgeApi = {
  list: () => request.get('/knowledge/documents'),
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  remove: (id: string) => request.delete(`/knowledge/documents/${id}`),
  search: (query: string, topK: number) => request.post('/knowledge/search', { query, topK }),
}

// 对话 API
export const chatApi = {
  listSessions: () => request.get('/chat/sessions'),
  createSession: () => request.post('/chat/sessions'),
  listMessages: (sessionId: string) => request.get(`/chat/sessions/${sessionId}/messages`),
  sendMessage: (payload: { sessionId: string; content: string }) => request.post('/chat/messages', payload),
  removeSession: (id: string) => request.delete(`/chat/sessions/${id}`),
}
