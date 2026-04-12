import { ExecutionContext, ExecutionResult, WorkflowDefinition, WorkflowNode, PerformanceMetrics } from '../types'
import { CompensationExecutor, CompensationAction } from './compensation-executor'
import { AgentService } from '../../agent/agent.service'
import { KnowledgeService } from '../../knowledge/knowledge.service'
import { WorkflowHttpService } from '../services/http.service'
import { CodeExecutionService } from '../services/code-execution.service'
import { WorkflowError, ErrorSeverity } from '../types/error.types'

// 工作流执行引擎：负责解析节点并执行
export class WorkflowEngine {
  private nodes: Map<string, WorkflowNode>
  private edges: Array<{ source: string; target: string }>
  private metrics: PerformanceMetrics[] = []

  constructor(
    private workflow: WorkflowDefinition,
    private agentService: AgentService,
    private knowledgeService: KnowledgeService,
    private compensationExecutor: CompensationExecutor,
    private httpService?: WorkflowHttpService,
    private codeExecutionService?: CodeExecutionService
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
      metrics: [],
    }

    // 重置性能指标
    this.metrics = []
    const workflowStartTime = Date.now()

    try {
      // 先检测是否存在静态环，避免执行时死循环
      this.topologicalSort()

      // 跟踪节点访问次数，用于检测动态循环（条件分支可能导致的环）
      // 使用访问次数而不是简单Set，允许合法的多路径但防止真正的循环
      const nodeVisitCount = new Map<string, number>()
      const MAX_VISITS_PER_NODE = 3  // 同一节点最多访问3次

      // 按连线进行执行，符合真实工作流路径
      const startNode = this.findStartNode()
      let currentNode: WorkflowNode | undefined = startNode
      let stepCount = 0
      const MAX_TOTAL_STEPS = 200  // 总步数限制

      while (currentNode) {
        stepCount += 1
        if (stepCount > MAX_TOTAL_STEPS) {
          throw new Error(`工作流执行步数超过 ${MAX_TOTAL_STEPS} 步，可能存在无限循环`)
        }

        // 检测节点访问次数，防止动态循环
        const currentVisits = nodeVisitCount.get(currentNode.id) || 0
        if (currentVisits >= MAX_VISITS_PER_NODE) {
          throw new Error(`节点 ${currentNode.id} 已访问 ${MAX_VISITS_PER_NODE} 次，检测到循环执行`)
        }
        nodeVisitCount.set(currentNode.id, currentVisits + 1)

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
        // 调用大模型，支持变量模板替换
        const llmPrompt = this.replaceVariables(
          node.data?.prompt || '你是一个智能助手',
          context.variables
        )
        // 支持指定输入源，默认为原始输入，也可引用上游节点输出
        const inputSourceKey = node.data?.inputSource || 'input'
        const llmInput = inputSourceKey === 'input'
          ? context.input
          : (context.variables[inputSourceKey] ?? context.input)

        context.variables[node.id] = await this.agentService.chat({
          prompt: llmPrompt,
          input: llmInput,
          context: context.variables,
        })
        return

      case 'condition':
        // 条件节点只做判断，不在这里选择路径
        context.logs.push('条件节点已评估条件')
        return

      case 'code':
        // 执行代码节点
        if (!this.codeExecutionService) {
          throw new Error('代码执行服务未初始化')
        }
        const codeConfig = {
          code: node.data?.code || '',
          timeout: node.data?.timeout || 5000,
          context: context.variables,
        }
        context.variables[node.id] = await this.codeExecutionService.execute(
          codeConfig,
          node.id
        )
        return

      case 'http':
        // HTTP 请求节点
        if (!this.httpService) {
          throw new Error('HTTP 服务未初始化')
        }
        const httpConfig = node.data?.httpConfig || {
          url: node.data?.url,
          method: node.data?.method || 'GET',
          headers: node.data?.headers,
          body: node.data?.body,
          timeout: node.data?.timeout || 30000,
          retries: node.data?.retries || 0,
          retryDelay: node.data?.retryDelay || 1000,
        }

        // 替换 URL 和 Body 中的变量
        const resolvedUrl = this.httpService.replaceVariables(httpConfig.url, context.variables)
        const resolvedBody = httpConfig.body
          ? this.httpService.replaceVariablesInBody(httpConfig.body, context.variables)
          : undefined

        context.variables[node.id] = await this.httpService.execute({
          ...httpConfig,
          url: resolvedUrl,
          body: resolvedBody,
        })
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

    // 性能指标基础数据
    let tokensUsed = 0
    let httpRequests = 0
    let httpDuration = 0
    let cacheHit = false

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        if (attempt > 0) {
          context.variables = { ...snapshot }
        }

        // 记录节点执行前的变量快照（用于性能分析）
        const nodeStartTime = Date.now()

        if (timeoutMs > 0) {
          await this.withTimeout(this.executeNode(node, context), timeoutMs)
        } else {
          await this.executeNode(node, context)
        }

        // 根据节点类型收集特定指标
        const nodeOutput = context.variables[node.id]
        if (node.type === 'http' && nodeOutput) {
          httpRequests = 1
          httpDuration = nodeOutput.duration || 0
        }

        this.registerCompensation(node, context)

        // Record Success
        const endTime = Date.now()
        const duration = endTime - startTime
        const step = context.steps[stepIndex]
        step.endTime = endTime
        step.duration = duration
        step.status = 'success'
        step.output = nodeOutput

        // 记录性能指标
        this.recordMetric({
          nodeId: node.id,
          nodeType: node.type,
          startTime,
          endTime,
          duration,
          tokensUsed,
          httpRequests,
          httpDuration,
          cacheHit,
        })

        return 'ok'
      } catch (error: any) {
        const message = error?.message || '执行失败'
        context.logs.push(`节点 ${node.id} 执行失败（${attempt + 1}/${retryCount + 1}）：${message}`)

        // 检查是否是 WorkflowError，根据严重级别决定是否重试
        if (error instanceof WorkflowError) {
          if (!error.shouldRetry() && attempt === 0) {
            // 不可重试的错误，直接跳出
            context.logs.push(`错误级别: ${error.severity}，不可重试`)
            break
          }
        }

        if (attempt < retryCount && retryDelayMs > 0) {
          await this.sleep(retryDelayMs)
        }
      }
    }

    // Record Failure (initial)
    const endTime = Date.now()
    const duration = endTime - startTime
    const step = context.steps[stepIndex]
    step.endTime = endTime
    step.duration = duration
    step.status = 'failed'
    step.output = { error: 'Execution failed after retries' }

    // 记录失败的性能指标
    this.recordMetric({
      nodeId: node.id,
      nodeType: node.type,
      startTime,
      endTime,
      duration,
      tokensUsed,
      httpRequests,
      httpDuration,
      cacheHit,
    })

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

  /**
   * 记录性能指标
   */
  private recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric)
  }

  /**
   * 获取执行性能统计
   */
  getPerformanceStats() {
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0)
    const nodeTypeStats = new Map<string, { count: number; totalDuration: number }>()

    for (const metric of this.metrics) {
      const stats = nodeTypeStats.get(metric.nodeType) || { count: 0, totalDuration: 0 }
      stats.count += 1
      stats.totalDuration += metric.duration
      nodeTypeStats.set(metric.nodeType, stats)
    }

    return {
      totalNodes: this.metrics.length,
      totalDuration,
      avgDuration: this.metrics.length > 0 ? totalDuration / this.metrics.length : 0,
      byType: Object.fromEntries(nodeTypeStats),
    }
  }

  /**
   * 变量模板替换：将 {{variableName}} 替换为实际值
   * 支持嵌套引用，如 {{node1.output}} 或简单变量名
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    if (!template || typeof template !== 'string') {
      return template
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key]
      if (value === undefined || value === null) {
        // 保留原样，不替换
        return match
      }
      // 如果是对象或数组，转为JSON字符串
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value)
        } catch {
          return String(value)
        }
      }
      return String(value)
    })
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

    // 查找配置的目标边 ID（优先级最高）
    const edgeIdKey = isTrue ? 'trueEdgeId' : 'falseEdgeId'
    const configuredEdgeId = currentNode.data?.[edgeIdKey]
    if (configuredEdgeId) {
      const edge = outgoing.find((item: any) => item.id === configuredEdgeId)
      if (edge?.target) return edge.target
    }

    // 根据分支标签选择（True/False 标签）
    const branchLabel = isTrue ? 'True' : 'False'
    const labeled = outgoing.find((edge: any) =>
      edge.branchType === branchLabel || edge.label === branchLabel
    )
    if (labeled?.target) {
      return labeled.target
    }

    // 默认取第一条边，条件为假时尝试第二条
    return isTrue ? outgoing[0]?.target : (outgoing[1]?.target || outgoing[0]?.target)
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
