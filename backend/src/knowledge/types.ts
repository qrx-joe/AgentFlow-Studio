// 知识库相关类型

export interface SearchResult {
  id: string
  documentId: string
  content: string
  similarity: number
  keywordHits?: number
  keywordScore?: number
  fusedScore?: number
  // RRF 融合相关字段
  rrfScore?: number
  finalScore?: number
  vectorRank?: number
  keywordRank?: number
}

export interface KnowledgeSearchOptions {
  scoreThreshold?: number
  hybrid?: boolean
  rerank?: boolean
  vectorWeight?: number
  keywordWeight?: number
  keywordMode?: 'bm25' | 'tsrank' | 'trgm'
}
