// 工作流基础类型定义

export type NodeType = 'trigger' | 'llm' | 'knowledge' | 'condition' | 'code' | 'http' | 'end'

// HTTP 请求方法
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

// HTTP 节点配置
export interface HttpNodeConfig {
  url: string
  method: HttpMethod
  headers?: Record<string, string>
  body?: string | Record<string, any>
  timeout?: number
  retries?: number
  retryDelay?: number
  validateStatus?: (status: number) => boolean
}

// HTTP 响应结果
export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  data: any
  duration: number
}

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

// 性能指标
export interface PerformanceMetrics {
  nodeId: string
  nodeType: string
  startTime: number
  endTime: number
  duration: number
  tokensUsed?: number
  dbQueries?: number
  cacheHit?: boolean
  httpRequests?: number
  httpDuration?: number
}

export interface ExecutionContext {
  input: string
  variables: Record<string, any>
  logs: string[]
  compensations: Array<() => void | Promise<void>>
  steps: ExecutionStep[]
  metrics?: PerformanceMetrics[]
}

export interface ExecutionResult {
  status: 'completed' | 'failed'
  output?: Record<string, any>
  logs: string[]
  steps?: ExecutionStep[]
  error?: string
}
