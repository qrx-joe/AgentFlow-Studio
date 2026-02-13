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
  label?: string
  branchType?: 'True' | 'False'
}

export interface WorkflowDefinition {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface ExecutionStep {
  nodeId: string
  status: 'running' | 'success' | 'failed' | 'skipped'
  startTime: number
  endTime?: number
  duration?: number
  output?: any
}

export interface ExecutionContext {
  input: string
  variables: Record<string, any>
  logs: string[]
  compensations: Array<() => void | Promise<void>>
  steps: ExecutionStep[]
}

export interface ExecutionResult {
  status: 'completed' | 'failed'
  output?: Record<string, any>
  logs: string[]
  steps?: ExecutionStep[]
  error?: string
}
