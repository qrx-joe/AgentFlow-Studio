import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HttpModule } from '@nestjs/axios'
import { WorkflowController } from './workflow.controller'
import { WorkflowService } from './workflow.service'
import { WorkflowEntity } from './entities/workflow.entity'
import { WorkflowExecutionEntity } from './entities/workflow-execution.entity'
import { AgentModule } from '../agent/agent.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'
import { MetricsModule } from '../metrics/metrics.module'
import { CompensationExecutor } from './engine/compensation-executor'
import { WorkflowHttpService } from './services/http.service'
import { CodeExecutionService } from './services/code-execution.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity, WorkflowExecutionEntity]),
    HttpModule,
    AgentModule,
    KnowledgeModule,
    MetricsModule,
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService, CompensationExecutor, WorkflowHttpService, CodeExecutionService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
