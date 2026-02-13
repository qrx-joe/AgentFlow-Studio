import { ExecutionContext, ExecutionResult, WorkflowDefinition, WorkflowNode } from '../types'
import { CompensationExecutor, CompensationAction } from './compensation-executor'
import { AgentService } from '../../agent/agent.service'
import { KnowledgeService } from '../../knowledge/knowledge.service'

// 工作流执行引擎：负责解析节点并执行
export class WorkflowEngine {
  private nodes: Map<string, WorkflowNode>
  private edges: Array<{ source: string; target: string }>

  constructor(
    private workflow: WorkflowDefinition,
    private agentService: AgentService,
    private knowledgeService: KnowledgeService,
    private compensationExecutor: CompensationExecutor
  ) {
    this.nodes = new Map(workflow.nodes.map((n) => [n.id, n]))
    this.edges = workflow.edges
  }

  async execute(input: string): Promise<ExecutionResult> {
    const context: ExecutionContext = {
      input,
      variables: {},
      logs: [],
      compensations: [],
      steps: [],
    }

    try {
      // 先检测是否存在环，避免执行时死循环
      this.topologicalSort()

      // 按连线进行执行，符合真实工作流路径
      const startNode = this.findStartNode()
      let currentNode: WorkflowNode | undefined = startNode
      let stepCount = 0

      while (currentNode) {
        stepCount += 1
        if (stepCount > 200) {
          throw new Error('工作流执行步数过多，可能存在循环')
        }

        const nodeResult = await this.executeNodeWithPolicy(currentNode, context)
        if (nodeResult === 'failed') {
          throw new Error(`节点 ${currentNode.id} 执行失败`)
        }

        if (currentNode.type === 'end') {
          break
        }

        const nextNodeId = this.getNextNodeId(currentNode, context)
        currentNode = nextNodeId ? this.nodes.get(nextNodeId) : undefined
      }

      return {
        status: 'completed',
        output: context.variables,
        logs: context.logs,
        steps: context.steps
      }
    } catch (error: any) {
      return {
        status: 'failed',
        error: error?.message || '执行失败',
        logs: context.logs,
        steps: context.steps,
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
          node.data?.topK || 3,
          {
            scoreThreshold: node.data?.scoreThreshold,
            hybrid: node.data?.hybrid,
            rerank: node.data?.rerank,
          }
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
        // 条件节点只做判断，不在这里选择路径
        context.logs.push('条件节点已评估条件')
        return

      case 'code':
        context.logs.push('代码节点暂未执行自定义逻辑')
        return

      case 'end':
        context.logs.push('到达结束节点')
        return
    }
  }

  private async executeNodeWithPolicy(node: WorkflowNode, context: ExecutionContext) {
    const retryCount = Number(node.data?.retryCount || 0)
    const retryDelayMs = Number(node.data?.retryDelayMs || 0)
    const timeoutMs = Number(node.data?.timeoutMs || 0)
    const onError = node.data?.onError === 'skip' || node.data?.onError === 'rollback'
      ? node.data?.onError
      : 'fail'
    const snapshot = { ...context.variables }

    // Record Step Start
    const startTime = Date.now()
    const stepIndex = context.steps.push({
      nodeId: node.id,
      status: 'running',
      startTime,
    }) - 1

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        if (attempt > 0) {
          context.variables = { ...snapshot }
        }
        if (timeoutMs > 0) {
          await this.withTimeout(this.executeNode(node, context), timeoutMs)
        } else {
          await this.executeNode(node, context)
        }
        this.registerCompensation(node, context)

        // Record Success
        const endTime = Date.now()
        const step = context.steps[stepIndex]
        step.endTime = endTime
        step.duration = endTime - startTime
        step.status = 'success'
        step.output = context.variables[node.id]

        return 'ok'
      } catch (error: any) {
        const message = error?.message || '执行失败'
        context.logs.push(`节点 ${node.id} 执行失败（${attempt + 1}/${retryCount + 1}）：${message}`)
        if (attempt < retryCount && retryDelayMs > 0) {
          await this.sleep(retryDelayMs)
        }
      }
    }

    // Record Failure (initial)
    const endTime = Date.now()
    const step = context.steps[stepIndex]
    step.endTime = endTime
    step.duration = endTime - startTime
    step.status = 'failed'
    step.output = { error: 'Execution failed after retries' }

    if (node.data?.onError === 'compensate') {
      await this.runCompensations(context)
      context.logs.push(`节点 ${node.id} 已触发补偿（失败后策略）`)
      return 'failed'
    }
    if (onError === 'rollback') {
      context.variables = { ...snapshot }
      context.logs.push(`节点 ${node.id} 已回滚（失败后策略）`)
      return 'failed'
    }
    if (onError === 'skip') {
      if (context.variables[node.id] !== undefined) {
        delete context.variables[node.id]
      }
      context.logs.push(`节点 ${node.id} 已跳过（失败后策略）`)
      // Record Skip
      step.status = 'skipped'
      return 'skipped'
    }

    return 'failed'
  }

  private registerCompensation(node: WorkflowNode, context: ExecutionContext) {
    const keys = Array.isArray(node.data?.compensateKeys) ? node.data.compensateKeys : []
    const actions = Array.isArray(node.data?.compensationActions) ? node.data.compensationActions : []

    if (actions.length === 0 && keys.length === 0 && context.variables[node.id] === undefined) return

    context.compensations.push(async () => {
      if (actions.length > 0) {
        for (const action of actions) {
          await this.executeCompensationAction(action, context)
        }
      }

      const targets = keys.length > 0 ? keys : [node.id]
      targets.forEach(key => {
        if (context.variables[key] !== undefined) {
          delete context.variables[key]
        }
      })
    })
  }

  private async runCompensations(context: ExecutionContext) {
    const stack = [...context.compensations].reverse()
    for (const task of stack) {
      try {
        await task()
      } catch {
        context.logs.push('补偿执行失败')
      }
    }
    context.compensations = []
  }

  private async executeCompensationAction(action: CompensationAction, context: ExecutionContext) {
    await this.compensationExecutor.execute(action, context, context.logs)
  }

  private async withTimeout<T>(task: Promise<T>, timeoutMs: number) {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('节点执行超时')), timeoutMs)
    })
    try {
      return await Promise.race([task, timeout])
    } finally {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }

  private async sleep(ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms))
  }

  // 选择下一个节点：普通节点取第一条边，条件节点分流
  private getNextNodeId(currentNode: WorkflowNode, context: ExecutionContext) {
    const outgoing = this.edges.filter((edge) => edge.source === currentNode.id)

    if (outgoing.length === 0) {
      return undefined
    }

    if (currentNode.type !== 'condition') {
      if (outgoing.length > 1) {
        context.logs.push(`节点 ${currentNode.id} 存在多条出边，默认取第一条`)
      }
      return outgoing[0].target
    }

    const isTrue = this.evaluateCondition(currentNode, context)

    // 优先使用配置的目标边 ID
    const trueEdgeId = currentNode.data?.trueEdgeId
    if (isTrue && trueEdgeId) {
      const edge = outgoing.find((item: any) => item.id === trueEdgeId)
      if (edge?.target) return edge.target
    }

    const falseEdgeId = currentNode.data?.falseEdgeId
    if (!isTrue && falseEdgeId) {
      const edge = outgoing.find((item: any) => item.id === falseEdgeId)
      if (edge?.target) return edge.target
    }

    // 兼容旧配置：目标节点优先
    const trueTarget = currentNode.data?.trueTarget
    if (isTrue && trueTarget) {
      return trueTarget
    }

    const falseTarget = currentNode.data?.falseTarget
    if (!isTrue && falseTarget) {
      return falseTarget
    }

    // 根据连线标签/分支类型选择目标
    const labeled = outgoing.find((edge: any) =>
      (edge.branchType || edge.label) === (isTrue ? 'True' : 'False')
    )
    if (labeled?.target) {
      return labeled.target
    }

    // 未配置目标时，默认取第一/第二条出边
    if (isTrue) {
      return outgoing[0]?.target
    }
    return outgoing[1]?.target || outgoing[0]?.target
  }

  // 条件判断：支持变量对比与输入真值判断
  private evaluateCondition(node: WorkflowNode, context: ExecutionContext) {
    const variableKey = node.data?.variableKey as string | undefined
    const expectedValue = node.data?.expectedValue as string | undefined

    if (variableKey) {
      const actual = context.variables[variableKey]
      if (expectedValue !== undefined && expectedValue !== null) {
        return String(actual) === String(expectedValue)
      }
      return Boolean(actual)
    }

    return Boolean(context.input)
  }

  // 查找触发节点作为执行起点
  private findStartNode(): WorkflowNode {
    const startNode = [...this.nodes.values()].find((n) => n.type === 'trigger')
    if (!startNode) {
      throw new Error('工作流缺少触发节点')
    }
    return startNode
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
