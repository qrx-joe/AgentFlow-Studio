import { ExecutionContext, ExecutionResult, WorkflowDefinition, WorkflowNode } from '../types'
import { AgentService } from '../../agent/agent.service'
import { KnowledgeService } from '../../knowledge/knowledge.service'

// 工作流执行引擎：负责解析节点并执行
export class WorkflowEngine {
  private nodes: Map<string, WorkflowNode>
  private edges: Array<{ source: string; target: string }>

  constructor(
    private workflow: WorkflowDefinition,
    private agentService: AgentService,
    private knowledgeService: KnowledgeService
  ) {
    this.nodes = new Map(workflow.nodes.map((n) => [n.id, n]))
    this.edges = workflow.edges
  }

  async execute(input: string): Promise<ExecutionResult> {
    const context: ExecutionContext = {
      input,
      variables: {},
      logs: [],
    }

    try {
      const order = this.topologicalSort()
      for (const nodeId of order) {
        const node = this.nodes.get(nodeId)
        if (!node) continue
        await this.executeNode(node, context)
      }

      return { status: 'completed', output: context.variables, logs: context.logs }
    } catch (error: any) {
      return {
        status: 'failed',
        error: error?.message || '执行失败',
        logs: context.logs,
      }
    }
  }

  private async executeNode(node: WorkflowNode, context: ExecutionContext) {
    context.logs.push(`执行节点：${node.type} (${node.id})`)

    switch (node.type) {
      case 'trigger':
        context.variables[node.id] = context.input
        return

      case 'knowledge':
        // 调用知识库检索
        context.variables[node.id] = await this.knowledgeService.search(
          context.input,
          node.data?.topK || 3
        )
        return

      case 'llm':
        // 调用大模型
        context.variables[node.id] = await this.agentService.chat({
          prompt: node.data?.prompt || '你是一个智能助手',
          input: context.input,
          context: context.variables,
        })
        return

      case 'condition':
        // MVP：条件节点暂不分流，只记录
        context.logs.push('条件节点暂未实现分支逻辑')
        return

      case 'code':
        context.logs.push('代码节点暂未执行自定义逻辑')
        return

      case 'end':
        context.logs.push('到达结束节点')
        return
    }
  }

  // 拓扑排序：确保执行顺序
  private topologicalSort(): string[] {
    const inDegree = new Map<string, number>()
    const adjList = new Map<string, string[]>()

    this.nodes.forEach((_, id) => {
      inDegree.set(id, 0)
      adjList.set(id, [])
    })

    this.edges.forEach((edge) => {
      adjList.get(edge.source)?.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    })

    const queue: string[] = []
    inDegree.forEach((degree, id) => {
      if (degree === 0) queue.push(id)
    })

    const result: string[] = []
    while (queue.length > 0) {
      const nodeId = queue.shift() as string
      result.push(nodeId)

      const neighbors = adjList.get(nodeId) || []
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) queue.push(neighbor)
      }
    }

    if (result.length !== this.nodes.size) {
      throw new Error('工作流存在循环依赖，无法执行')
    }

    return result
  }
}
