import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { WorkflowModule } from './workflow/workflow.module'
import { KnowledgeModule } from './knowledge/knowledge.module'
import { ChatModule } from './chat/chat.module'
import { AgentModule } from './agent/agent.module'

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
      logging: process.env.NODE_ENV === 'development',
    }),

    WorkflowModule,
    KnowledgeModule,
    ChatModule,
    AgentModule,
  ],
})
export class AppModule {}
