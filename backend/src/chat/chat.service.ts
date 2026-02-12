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
  ) { }

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
    const { content } = payload
    const sessionId = await this.ensureSession(payload.sessionId)

    // 0. 拉取最近对话，构建多轮上下文
    const history = await this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: 10,
    })

    // 1. 保存用户消息
    await this.messageRepo.save({
      sessionId,
      role: 'user',
      content,
    })

    // 2. 检索知识库，构造上下文（允许失败，不影响对话）
    let sources: ChatSource[] = []
    let contextText = ''
    try {
      const searchResults = await this.knowledgeService.search(content, 3)
      sources = searchResults.map((item) => ({
        documentId: item.documentId,
        content: item.content,
      }))
      contextText = searchResults.map((item) => item.content).join('\n\n---\n\n')
    } catch (e) {
      console.warn('[ChatService] Knowledge search failed in sendMessage:', (e as any)?.message)
    }

    // 3. 调用 LLM
    const prompt = contextText
      ? `你是一个智能助手，请基于以下知识回答问题：\n${contextText}`
      : '你是一个智能助手，请回答用户的问题。'
    const answer = await this.agentService.chat({
      prompt,
      input: content,
      context: { sources },
      history: history.map(item => ({ role: item.role, content: item.content })),
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

  // 流式对话：边生成边返回 token
  async streamMessage(
    payload: { sessionId: string; content: string },
    onToken: (token: string) => void
  ) {
    const { content } = payload
    const sessionId = await this.ensureSession(payload.sessionId)

    // 0. 拉取最近对话，构建多轮上下文
    const history = await this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: 10,
    })

    // 判断是否为第一条消息（用于生成标题）
    const isFirstMessage = history.length === 0

    // 1. 保存用户消息
    await this.messageRepo.save({
      sessionId,
      role: 'user',
      content,
    })

    // 2. 检索知识库，构造上下文（允许失败，不影响对话）
    let sources: ChatSource[] = []
    let contextText = ''
    try {
      const searchResults = await this.knowledgeService.search(content, 3)
      sources = searchResults.map((item) => ({
        documentId: item.documentId,
        content: item.content,
      }))
      contextText = searchResults.map((item) => item.content).join('\n\n---\n\n')
    } catch (e) {
      console.warn('[ChatService] Knowledge search failed, proceeding without context:', (e as any)?.message)
    }

    // 3. 流式调用 LLM
    const prompt = contextText
      ? `你是一个智能助手，请基于以下知识回答问题：\n${contextText}`
      : '你是一个智能助手，请回答用户的问题。'

    let fullText = ''
    try {
      for await (const token of this.agentService.streamChat({
        prompt,
        input: content,
        context: { sources },
        history: history.map(item => ({ role: item.role, content: item.content })),
      })) {
        fullText += token
        onToken(token)
      }
    } catch (e) {
      console.error('[ChatService] LLM stream failed:', (e as any)?.message)
      if (!fullText) {
        const fallbackMsg = `抱歉，AI 服务暂时不可用：${(e as any)?.message || '未知错误'}`
        fullText = fallbackMsg
        onToken(fallbackMsg)
      }
    }

    // 4. 保存助手消息
    const assistant = await this.messageRepo.save({
      sessionId,
      role: 'assistant',
      content: fullText,
      sources,
    })

    // 5. 如果是第一条消息，生成会话标题
    if (isFirstMessage) {
      this.generateSessionTitle(sessionId, content, fullText).catch(err => {
        console.warn('[ChatService] Failed to generate session title:', err)
      })
    }

    return assistant
  }

  // 生成会话标题
  private async generateSessionTitle(sessionId: string, userMessage: string, assistantMessage: string) {
    try {
      const titlePrompt = '请根据以下对话内容，生成一个简短的标题（不超过20个字），只返回标题文本，不要有任何其他内容：'
      const context = `用户：${userMessage}\n助手：${assistantMessage.substring(0, 200)}`

      const title = await this.agentService.chat({
        prompt: titlePrompt,
        input: context,
        context: {},
      })

      // 清理标题：去除引号、换行等
      const cleanTitle = title.trim().replace(/^["']|["']$/g, '').replace(/\n/g, ' ').substring(0, 50)

      if (cleanTitle && cleanTitle !== '新会话') {
        await this.sessionRepo.update(sessionId, {
          title: cleanTitle,
          updatedAt: new Date()
        })
        console.log(`[ChatService] Generated title for session ${sessionId}: ${cleanTitle}`)
      }
    } catch (error) {
      console.error('[ChatService] Error generating session title:', error)
    }
  }

  private async ensureSession(sessionId?: string) {
    if (sessionId) {
      const existing = await this.sessionRepo.findOne({ where: { id: sessionId } })
      if (existing) return existing.id
    }
    const session = this.sessionRepo.create({ title: '新会话' })
    const saved = await this.sessionRepo.save(session)
    return saved.id
  }
}
