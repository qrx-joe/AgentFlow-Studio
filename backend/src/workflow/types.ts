// 工作流基础类型定义

export type NodeType = 'trigger' | 'llm' | 'knowledge' | 'condition' | 'code' | 'end'

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
}

export interface WorkflowDefinition {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface ExecutionContext {
  input: string
  variables: Record<string, any>
  logs: string[]
}

export interface ExecutionResult {
  status: 'completed' | 'failed'
  output?: Record<string, any>
  logs: string[]
  error?: string
}
