import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'

// Agent 服务：封装 LLM 调用逻辑
@Injectable()
export class AgentService {
  private client?: OpenAI

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: process.env.OPENAI_BASE_URL,
      })
    }
  }

  async chat(payload: {
    prompt: string
    input: string
    context: Record<string, any>
    history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  }) {
    const model = process.env.LLM_MODEL || 'gpt-4o-mini'

    const systemPrompt = `${payload.prompt}\n\n【上下文】\n${JSON.stringify(payload.context)}`
    const history = payload.history || []

    if (this.client) {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: payload.input },
        ],
      })
      return response.choices[0]?.message?.content || ''
    }

    // 无 API Key 时返回降级文本
    return `【模拟回答】${payload.input}`
  }

  // 流式输出：逐步返回 token，便于前端实时展示
  async *streamChat(payload: {
    prompt: string
    input: string
    context: Record<string, any>
    history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  }): AsyncGenerator<string> {
    const model = process.env.LLM_MODEL || 'gpt-4o-mini'
    const systemPrompt = `${payload.prompt}\n\n【上下文】\n${JSON.stringify(payload.context)}`
    const history = payload.history || []

    if (this.client) {
      const stream = await this.client.chat.completions.create({
        model,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: payload.input },
        ],
      })

      for await (const part of stream) {
        const token = part.choices[0]?.delta?.content
        if (token) {
          yield token
        }
      }
      return
    }

    // 无 API Key 时使用模拟流式输出
    const fallback = `【模拟回答】${payload.input}`
    for (const char of fallback) {
      yield char
    }
  }
}
