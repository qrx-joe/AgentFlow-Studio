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

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity) private workflowRepo: Repository<WorkflowEntity>,
    @InjectRepository(WorkflowExecutionEntity)
    private executionRepo: Repository<WorkflowExecutionEntity>,
    private agentService: AgentService,
    private knowledgeService: KnowledgeService
  ) {}

  async findAll() {
    return this.workflowRepo.find({ order: { updatedAt: 'DESC' } })
  }

  async findOne(id: string) {
    return this.workflowRepo.findOneBy({ id })
  }

  async create(dto: CreateWorkflowDto) {
    const entity = this.workflowRepo.create(dto)
    return this.workflowRepo.save(entity)
  }

  async update(id: string, dto: UpdateWorkflowDto) {
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
      throw new Error('工作流不存在')
    }

    // 初始化执行记录
    const execution = await this.executionRepo.save({
      workflowId: id,
      status: 'running',
      input: { input },
      logs: [],
    })

    const definition: WorkflowDefinition = {
      id: workflow.id,
      name: workflow.name,
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
    }

    const engine = new WorkflowEngine(definition, this.agentService, this.knowledgeService)
    const result = await engine.execute(input || '')

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
}
