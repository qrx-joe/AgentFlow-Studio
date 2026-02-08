// 知识库相关类型

export interface SearchResult {
  id: string
  documentId: string
  content: string
  similarity: number
}

export interface KnowledgeSearchOptions {
  scoreThreshold?: number
  hybrid?: boolean
  rerank?: boolean
}
