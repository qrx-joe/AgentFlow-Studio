import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { ChatSessionEntity } from './entities/chat-session.entity'
import { ChatMessageEntity } from './entities/chat-message.entity'
import { AgentService } from '../agent/agent.service'
import { KnowledgeService } from '../knowledge/knowledge.service'
import type { ChatSource } from './types'

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSessionEntity) private sessionRepo: Repository<ChatSessionEntity>,
    @InjectRepository(ChatMessageEntity) private messageRepo: Repository<ChatMessageEntity>,
    private agentService: AgentService,
    private knowledgeService: KnowledgeService
  ) {}

  async listSessions() {
    return this.sessionRepo.find({ order: { updatedAt: 'DESC' } })
  }

  async createSession() {
    const session = this.sessionRepo.create({ title: '新会话' })
    return this.sessionRepo.save(session)
  }

  async listMessages(sessionId: string) {
    return this.messageRepo.find({ where: { sessionId }, order: { createdAt: 'ASC' } })
  }

  async deleteSession(id: string) {
    await this.sessionRepo.delete(id)
    return { id }
  }

  async sendMessage(payload: { sessionId: string; content: string }) {
    const { sessionId, content } = payload

    // 1. 保存用户消息
    await this.messageRepo.save({
      sessionId,
      role: 'user',
      content,
    })

    // 2. 检索知识库，构造上下文
    const searchResults = await this.knowledgeService.search(content, 3)
    const sources: ChatSource[] = searchResults.map((item) => ({
      documentId: item.documentId,
      content: item.content,
    }))

    const contextText = searchResults.map((item) => item.content).join('\n\n---\n\n')

    // 3. 调用 LLM
    const answer = await this.agentService.chat({
      prompt: `你是一个智能助手，请基于以下知识回答问题：\n${contextText}`,
      input: content,
      context: { sources },
    })

    // 4. 保存助手消息
    const assistant = await this.messageRepo.save({
      sessionId,
      role: 'assistant',
      content: answer,
      sources,
    })

    return assistant
  }
}
