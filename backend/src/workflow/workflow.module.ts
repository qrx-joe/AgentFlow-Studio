import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WorkflowController } from './workflow.controller'
import { WorkflowService } from './workflow.service'
import { WorkflowEntity } from './entities/workflow.entity'
import { WorkflowExecutionEntity } from './entities/workflow-execution.entity'
import { AgentModule } from '../agent/agent.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'
import { MetricsModule } from '../metrics/metrics.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity, WorkflowExecutionEntity]),
    AgentModule,
    KnowledgeModule,
    MetricsModule,
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
