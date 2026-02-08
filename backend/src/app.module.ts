import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { WorkflowModule } from './workflow/workflow.module'
import { KnowledgeModule } from './knowledge/knowledge.module'
import { ChatModule } from './chat/chat.module'
import { AgentModule } from './agent/agent.module'
import { AppCacheModule } from './common/cache/cache.module'
import { MetricsModule } from './metrics/metrics.module'

@Module({
  imports: [
    // 环境变量加载
    ConfigModule.forRoot({ isGlobal: true }),

    // 数据库连接
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      extra: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
      cache: {
        duration: 30000,
      },
      logging: process.env.NODE_ENV === 'development',
    }),

    AppCacheModule,

    WorkflowModule,
    KnowledgeModule,
    ChatModule,
    AgentModule,
    MetricsModule,
  ],
})
export class AppModule {}
