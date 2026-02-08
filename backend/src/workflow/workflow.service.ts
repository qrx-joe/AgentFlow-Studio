import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { WorkflowEntity } from './entities/workflow.entity'
import { WorkflowExecutionEntity } from './entities/workflow-execution.entity'
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto'
import { WorkflowEngine } from './engine/workflow-engine'
import { AgentService } from '../agent/agent.service'
import { KnowledgeService } from '../knowledge/knowledge.service'
import { WorkflowDefinition } from './types'
import { BusinessException, ErrorCodes } from '../common/exceptions/business.exception'
import { MetricsService } from '../metrics/metrics.service'

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity) private workflowRepo: Repository<WorkflowEntity>,
    @InjectRepository(WorkflowExecutionEntity)
    private executionRepo: Repository<WorkflowExecutionEntity>,
    private agentService: AgentService,
    private knowledgeService: KnowledgeService,
    private metricsService: MetricsService
  ) {}

  async findAll() {
    return this.workflowRepo.find({ order: { updatedAt: 'DESC' } })
  }

  async findOne(id: string) {
    return this.workflowRepo.findOneBy({ id })
  }

  async create(dto: CreateWorkflowDto) {
    this.validateWorkflow({
      id: 'draft',
      name: dto.name,
      nodes: dto.nodes,
      edges: dto.edges,
    })
    const entity = this.workflowRepo.create(dto)
    return this.workflowRepo.save(entity)
  }

  async update(id: string, dto: UpdateWorkflowDto) {
    this.validateWorkflow({
      id,
      name: dto.name,
      nodes: dto.nodes,
      edges: dto.edges,
    })
    await this.workflowRepo.update(id, dto)
    return this.findOne(id)
  }

  async remove(id: string) {
    await this.workflowRepo.delete(id)
    return { id }
  }

  async execute(id: string, input: string) {
    const workflow = await this.findOne(id)
    if (!workflow) {
      throw new BusinessException(ErrorCodes.WORKFLOW_NOT_FOUND, '工作流不存在')
    }

    const definition: WorkflowDefinition = {
      id: workflow.id,
      name: workflow.name,
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
    }

    this.validateWorkflow(definition)

    // 初始化执行记录
    const execution = await this.executionRepo.save({
      workflowId: id,
      status: 'running',
      input: { input },
      logs: [],
    })

    const engine = new WorkflowEngine(definition, this.agentService, this.knowledgeService)
    const start = Date.now()
    const result = await engine.execute(input || '')
    this.metricsService.recordWorkflowExecution(Date.now() - start, result.status)

    // 更新执行结果
    await this.executionRepo.update(execution.id, {
      status: result.status === 'completed' ? 'completed' : 'failed',
      output: result.output,
      logs: result.logs,
      errorMessage: result.error,
      completedAt: new Date(),
    })

    return { executionId: execution.id, ...result }
  }

  async listExecutions(workflowId: string) {
    return this.executionRepo.find({
      where: { workflowId },
      order: { startedAt: 'DESC' },
      take: 20,
    })
  }

  // 后端强校验：确保规则一致，防止绕过前端
  private validateWorkflow(definition: WorkflowDefinition) {
    const nodes = definition.nodes || []
    const edges = definition.edges || []

    const outgoingMap = new Map<string, string[]>()
    const incomingMap = new Map<string, string[]>()

    edges.forEach(edge => {
      const outgoing = outgoingMap.get(edge.source) || []
      outgoing.push(edge.id)
      outgoingMap.set(edge.source, outgoing)

      const incoming = incomingMap.get(edge.target) || []
      incoming.push(edge.id)
      incomingMap.set(edge.target, incoming)
    })

    // 规则1：条件节点必须有 True/False 两条边
    for (const node of nodes) {
      if (node.type !== 'condition') continue
      const outgoingEdgeIds = outgoingMap.get(node.id) || []
      if (outgoingEdgeIds.length !== 2) {
        throw new BusinessException(ErrorCodes.WORKFLOW_INVALID, '条件节点必须有 True/False 两条边')
      }
      const labels = outgoingEdgeIds.map(id => {
        const edge = edges.find(item => item.id === id)
        return edge?.branchType || edge?.label
      })
      if (!(labels.includes('True') && labels.includes('False'))) {
        throw new BusinessException(ErrorCodes.WORKFLOW_INVALID, '条件节点必须包含 True/False 分支标签')
      }
    }

    // 规则2：触发节点必须只有 1 条出边
    for (const node of nodes) {
      if (node.type !== 'trigger') continue
      const outgoingCount = (outgoingMap.get(node.id) || []).length
      if (outgoingCount !== 1) {
        throw new BusinessException(ErrorCodes.WORKFLOW_INVALID, '触发节点必须只有 1 条出边')
      }
    }

    // 规则3：结束节点必须有 1 条入边
    for (const node of nodes) {
      if (node.type !== 'end') continue
      const incomingCount = (incomingMap.get(node.id) || []).length
      if (incomingCount !== 1) {
        throw new BusinessException(ErrorCodes.WORKFLOW_INVALID, '结束节点必须有 1 条入边')
      }
    }

    // 规则4：知识检索节点必须在 LLM 之前
    const knowledgeNodes = nodes.filter(node => node.type === 'knowledge')
    const llmNodes = nodes.filter(node => node.type === 'llm')
    if (knowledgeNodes.length > 0 && llmNodes.length > 0) {
      const reverseAdj = new Map<string, string[]>()
      edges.forEach(edge => {
        const list = reverseAdj.get(edge.target) || []
        list.push(edge.source)
        reverseAdj.set(edge.target, list)
      })

      const knowledgeIds = new Set(knowledgeNodes.map(node => node.id))

      for (const llm of llmNodes) {
        const stack = [llm.id]
        const visited = new Set<string>()
        let found = false

        while (stack.length > 0) {
          const current = stack.pop() as string
          if (visited.has(current)) continue
          visited.add(current)
          const parents = reverseAdj.get(current) || []
          for (const parent of parents) {
            if (knowledgeIds.has(parent)) {
              found = true
              break
            }
            stack.push(parent)
          }
          if (found) break
        }

        if (!found) {
          throw new BusinessException(ErrorCodes.WORKFLOW_INVALID, '知识检索节点必须在 LLM 之前')
        }
      }
    }
  }
}
