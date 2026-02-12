import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'

// Agent 服务：封装 LLM 调用逻辑
@Injectable()
export class AgentService {
  private client?: OpenAI

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY
    const baseURL = process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL,
      })
    }
  }

  async chat(payload: {
    prompt: string
    input: string
    context: Record<string, any>
    history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  }) {
    const model = process.env.LLM_MODEL || 'deepseek-chat'

    const systemPrompt = `${payload.prompt}\n\n【上下文】\n${JSON.stringify(payload.context)}`
    const history = payload.history || []

    if (this.client) {
      try {
        const response = await this.client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: payload.input },
          ],
        })
        const content = response.choices[0]?.message?.content
        if (!content) {
          console.error('[AgentService] LLM returned empty content')
          return '抱歉，AI 未能生成回复，请稍后重试。'
        }
        return content
      } catch (error) {
        console.error('[AgentService] LLM API call failed:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return `抱歉，AI 服务暂时不可用：${errorMessage}`
      }
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
    const model = process.env.LLM_MODEL || 'deepseek-chat'
    const systemPrompt = `${payload.prompt}\n\n【上下文】\n${JSON.stringify(payload.context)}`
    const history = payload.history || []

    if (this.client) {
      try {
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
      } catch (error) {
        console.error('[AgentService] LLM stream API call failed:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        yield `抱歉，AI 服务暂时不可用：${errorMessage}`
        return
      }
    }

    // 无 API Key 时使用模拟流式输出
    const fallback = `【模拟回答】${payload.input}`
    for (const char of fallback) {
      yield char
    }
  }
}
