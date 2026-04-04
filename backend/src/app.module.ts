import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CommonModule, Public } from './common/common.module'
import { WorkflowModule } from './workflow/workflow.module'
import { KnowledgeModule } from './knowledge/knowledge.module'
import { ChatModule } from './chat/chat.module'
import { AgentModule } from './agent/agent.module'
import { AppCacheModule } from './common/cache/cache.module'
import { MetricsModule } from './metrics/metrics.module'
import { HealthModule } from './health/health.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    CommonModule,

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,

      ssl: {
        rejectUnauthorized: false,
      },
      logging: process.env.NODE_ENV === 'development',
    }),

    AppCacheModule,

    WorkflowModule,
    KnowledgeModule,
    ChatModule,
    AgentModule,
    MetricsModule,
    HealthModule,
  ],
})
export class AppModule { }
