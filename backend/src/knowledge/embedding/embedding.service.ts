import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'

// Embedding 服务：优先使用真实 API，缺省时使用简化向量
@Injectable()
export class EmbeddingService {
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

  async embed(text: string): Promise<number[]> {
    if (this.client) {
      const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
      const response = await this.client.embeddings.create({
        model,
        input: text,
      })
      return response.data[0].embedding as number[]
    }

    // 无 API Key 时使用简单的伪向量，保证流程可跑通
    const dim = Number(process.env.EMBEDDING_DIMENSION || 1536)
    const vector = new Array(dim).fill(0)
    for (let i = 0; i < text.length; i += 1) {
      const idx = i % dim
      vector[idx] += text.charCodeAt(i) % 10
    }
    return vector
  }
}
