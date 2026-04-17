import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChatSessionEntity } from './entities/chat-session.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { AgentService } from '../agent/agent.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import type { ChatSource } from './types';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSessionEntity) private sessionRepo: Repository<ChatSessionEntity>,
    @InjectRepository(ChatMessageEntity) private messageRepo: Repository<ChatMessageEntity>,
    private agentService: AgentService,
    private knowledgeService: KnowledgeService,
  ) {}

  async listSessions() {
    return this.sessionRepo.find({ order: { updatedAt: 'DESC' } });
  }

  async createSession() {
    const session = this.sessionRepo.create({ title: '新会话' });
    return this.sessionRepo.save(session);
  }

  async listMessages(sessionId: string) {
    return this.messageRepo.find({ where: { sessionId }, order: { createdAt: 'ASC' } });
  }

  async deleteSession(id: string) {
    await this.sessionRepo.delete(id);
    return { id };
  }

  async sendMessage(payload: { sessionId: string; content: string }) {
    const { content } = payload;
    const sessionId = await this.ensureSession(payload.sessionId);

    // 0. 使用上下文压缩构建多轮对话
    const history = await this.buildContext(sessionId, 10, 4000);

    // 1. 保存用户消息
    await this.messageRepo.save({
      sessionId,
      role: 'user',
      content,
    });

    // 2. 检索知识库，构造上下文（允许失败，不影响对话）
    let sources: ChatSource[] = [];
    let contextText = '';
    try {
      const searchResults = await this.knowledgeService.search(content, 3);
      sources = searchResults.map((item) => ({
        documentId: item.documentId,
        content: item.content,
      }));
      contextText = searchResults.map((item) => item.content).join('\n\n---\n\n');
    } catch (e) {
      console.warn('[ChatService] Knowledge search failed in sendMessage:', (e as any)?.message);
    }

    // 3. 调用 LLM
    const prompt = contextText
      ? `你是一个智能助手，请基于以下知识回答问题：\n${contextText}`
      : '你是一个智能助手，请回答用户的问题。';
    const answer = await this.agentService.chat({
      prompt,
      input: content,
      context: { sources },
      history: history.map((item) => ({
        role: item.role as 'user' | 'assistant' | 'system',
        content: item.content,
      })),
    });

    // 4. 保存助手消息
    const assistant = await this.messageRepo.save({
      sessionId,
      role: 'assistant',
      content: answer,
      sources,
    });

    return assistant;
  }

  // 流式对话：边生成边返回 token
  async streamMessage(
    payload: { sessionId: string; content: string },
    onToken: (token: string) => void,
  ) {
    const { content } = payload;
    const sessionId = await this.ensureSession(payload.sessionId);

    // 0. 使用上下文压缩构建多轮对话
    const history = await this.buildContext(sessionId, 10, 4000);

    // 判断是否为第一条消息（用于生成标题）
    const isFirstMessage = history.length === 0;

    // 1. 保存用户消息
    await this.messageRepo.save({
      sessionId,
      role: 'user',
      content,
    });

    // 2. 检索知识库，构造上下文（允许失败，不影响对话）
    let sources: ChatSource[] = [];
    let contextText = '';
    try {
      const searchResults = await this.knowledgeService.search(content, 3);
      console.log(
        `[ChatService] search for "${content.substring(0, 30)}..." returned ${searchResults.length} results`,
        searchResults.map((r) => ({ doc: r.documentId?.slice(0, 8), sim: r.similarity })),
      );
      sources = searchResults.map((item) => ({
        documentId: item.documentId,
        content: item.content,
      }));
      contextText = searchResults.map((item) => item.content).join('\n\n---\n\n');
    } catch (e) {
      console.warn(
        '[ChatService] Knowledge search failed, proceeding without context:',
        (e as any)?.message,
      );
    }

    // 3. 流式调用 LLM
    const prompt = contextText
      ? `你是一个智能助手，请基于以下知识回答问题：\n${contextText}`
      : '你是一个智能助手，请回答用户的问题。';

    let fullText = '';
    try {
      for await (const token of this.agentService.streamChat({
        prompt,
        input: content,
        context: { sources },
        history: history.map((item) => ({
          role: item.role as 'user' | 'assistant' | 'system',
          content: item.content,
        })),
      })) {
        fullText += token;
        onToken(token);
      }
    } catch (e) {
      console.error('[ChatService] LLM stream failed:', (e as any)?.message);
      if (!fullText) {
        const fallbackMsg = `抱歉，AI 服务暂时不可用：${(e as any)?.message || '未知错误'}`;
        fullText = fallbackMsg;
        onToken(fallbackMsg);
      }
    }

    // 4. 保存助手消息
    const assistant = await this.messageRepo.save({
      sessionId,
      role: 'assistant',
      content: fullText,
      sources,
    });

    // 5. 如果是第一条消息，生成会话标题
    if (isFirstMessage) {
      this.generateSessionTitle(sessionId, content, fullText).catch((err) => {
        console.warn('[ChatService] Failed to generate session title:', err);
      });
    }

    return assistant;
  }

  /**
   * 构建对话上下文，支持上下文压缩
   * 当历史消息过多时，保留最近的 N 轮对话，对早期对话生成摘要
   */
  private async buildContext(sessionId: string, maxMessages = 10, maxTokensEstimate = 4000) {
    // 获取最近的消息
    const allHistory = await this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    if (allHistory.length <= maxMessages) {
      // 消息不多，直接返回全部
      return allHistory.map((item) => ({ role: item.role, content: item.content }));
    }

    // 需要压缩：保留最近 N 轮，对早期的生成摘要
    const recentMessages = allHistory.slice(-maxMessages);
    const earlyMessages = allHistory.slice(0, -maxMessages);

    // 估算 token（简化版：中文字符按1.5 token，英文按1 token）
    const estimateTokens = (text: string) => {
      const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      const otherChars = text.length - chineseChars;
      return Math.ceil(chineseChars * 1.5 + otherChars);
    };

    const totalTokens = allHistory.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);

    if (totalTokens <= maxTokensEstimate) {
      // Token 数不多，直接返回全部
      return allHistory.map((item) => ({ role: item.role, content: item.content }));
    }

    // 需要生成摘要
    try {
      const summary = await this.summarizeHistory(earlyMessages);

      // 组合：摘要 + 最近消息
      return [
        { role: 'system', content: `历史对话摘要：${summary}` },
        ...recentMessages.map((item) => ({ role: item.role, content: item.content })),
      ];
    } catch (error) {
      console.warn('[ChatService] Failed to summarize history, using recent messages only:', error);
      // 摘要生成失败，只返回最近消息
      return recentMessages.map((item) => ({ role: item.role, content: item.content }));
    }
  }

  /**
   * 生成历史对话摘要
   */
  private async summarizeHistory(messages: ChatMessageEntity[]): Promise<string> {
    if (messages.length === 0) return '';

    // 简单摘要：提取关键信息点
    const keyPoints: string[] = [];
    let lastUserMessage = '';

    for (const msg of messages) {
      if (msg.role === 'user') {
        lastUserMessage = msg.content.substring(0, 100); // 取前100字符
        keyPoints.push(`用户询问：${lastUserMessage}`);
      } else if (msg.role === 'assistant' && lastUserMessage) {
        // 提取助手回复的第一句话
        const firstSentence = msg.content.split(/[。！？.!?]/)[0];
        if (firstSentence) {
          keyPoints.push(`助手回复要点：${firstSentence.substring(0, 100)}`);
        }
        lastUserMessage = '';
      }
    }

    // 如果消息不多，直接连接关键信息
    if (messages.length <= 6) {
      return keyPoints.join('；');
    }

    // 消息较多，使用 LLM 生成摘要
    const summaryPrompt = `请对以下对话内容生成一个简短的摘要（不超过200字），保留关键信息点：

${messages.map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content.substring(0, 200)}`).join('\n')}

摘要：`;

    try {
      const summary = await this.agentService.chat({
        prompt: summaryPrompt,
        input: '',
        context: {},
      });
      return summary.trim();
    } catch (error) {
      // LLM 摘要失败，返回简单连接版
      return keyPoints.slice(-5).join('；'); // 只保留最近5个要点
    }
  }

  // 生成会话标题
  private async generateSessionTitle(
    sessionId: string,
    userMessage: string,
    assistantMessage: string,
  ) {
    try {
      const titlePrompt =
        '请根据以下对话内容，生成一个简短的标题（不超过20个字），只返回标题文本，不要有任何其他内容：';
      const context = `用户：${userMessage}\n助手：${assistantMessage.substring(0, 200)}`;

      const title = await this.agentService.chat({
        prompt: titlePrompt,
        input: context,
        context: {},
      });

      // 清理标题：去除引号、换行等
      const cleanTitle = title
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/\n/g, ' ')
        .substring(0, 50);

      if (cleanTitle && cleanTitle !== '新会话') {
        await this.sessionRepo.update(sessionId, {
          title: cleanTitle,
          updatedAt: new Date(),
        });
        console.log(`[ChatService] Generated title for session ${sessionId}: ${cleanTitle}`);
      }
    } catch (error) {
      console.error('[ChatService] Error generating session title:', error);
    }
  }

  private async ensureSession(sessionId?: string) {
    if (sessionId) {
      const existing = await this.sessionRepo.findOne({ where: { id: sessionId } });
      if (existing) return existing.id;
    }
    const session = this.sessionRepo.create({ title: '新会话' });
    const saved = await this.sessionRepo.save(session);
    return saved.id;
  }
}
