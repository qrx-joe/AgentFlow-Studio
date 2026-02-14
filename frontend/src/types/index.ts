// 通用类型定义，集中管理前后端交互数据结构

export type NodeType = 'trigger' | 'llm' | 'knowledge' | 'condition' | 'code' | 'end' | 'http'

export interface WorkflowNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data?: Record<string, any>
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  type?: string
  sourceHandle?: string | null
  targetHandle?: string | null
  label?: string
  branchType?: 'True' | 'False'
  style?: Record<string, any>
  labelStyle?: Record<string, any>
  labelBgStyle?: Record<string, any>
}

export interface Workflow {
  id: string
  name: string
  description?: string
  status?: string
  icon?: string
  color?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt?: string
  updatedAt?: string
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  input?: Record<string, any>
  output?: Record<string, any>
  logs: string[]
  startedAt: string
  completedAt?: string
  errorMessage?: string
}

export interface DocumentItem {
  id: string
  filename: string
  fileType?: string
  fileSize?: number
  metadata?: Record<string, any>
  createdAt?: string
}

export interface SearchResult {
  id: string
  documentId: string
  content: string
  similarity: number
  keywordHits?: number
  keywordScore?: number
  fusedScore?: number
}

export interface MessageSource {
  documentId?: string
  nodeId?: string
  content?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: MessageSource[]
  createdAt?: string
}

export interface Session {
  id: string
  title?: string
  workflowId?: string
  createdAt?: string
  updatedAt?: string
}
