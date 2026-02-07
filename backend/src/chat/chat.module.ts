import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { ChatSessionEntity } from './entities/chat-session.entity'
import { ChatMessageEntity } from './entities/chat-message.entity'
import { AgentModule } from '../agent/agent.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSessionEntity, ChatMessageEntity]),
    AgentModule,
    KnowledgeModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
