import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'

// Embedding 服务：优先使用真实 API，缺省时使用简化向量
@Injectable()
export class EmbeddingService {
  private client?: OpenAI

  constructor() {
    // 优先使用单独的 Embedding API 配置，否则回退到 OpenAI 配置
    const apiKey = process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY
    const baseURL = process.env.EMBEDDING_BASE_URL || process.env.OPENAI_BASE_URL

    // 只有在有 API Key 且 baseURL 支持 embedding 时才初始化客户端
    // DeepSeek 等非 OpenAI 服务可能不支持 embedding，此时跳过
    const skipEmbeddingApi = process.env.SKIP_EMBEDDING_API === 'true'

    if (apiKey && !skipEmbeddingApi) {
      this.client = new OpenAI({
        apiKey,
        baseURL,
      })
    }
  }

  // 批量生成 embedding，支持大量文本
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    const skip = process.env.SKIP_EMBEDDING_API === 'true'

    if (this.client && !skip) {
      try {
        const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
        const response = await this.client.embeddings.create({
          model,
          input: texts,
        })
        // 按输入顺序返回向量
        const sorted = response.data.sort((a, b) => a.index - b.index)
        return sorted.map((d) => d.embedding as number[])
      } catch (err) {
        console.warn('[EmbeddingService] Batch API 调用失败，降级为本地伪向量:', (err as Error).message)
      }
    }

    // 降级为伪向量
    const dim = Number(process.env.EMBEDDING_DIMENSION || 1536)
    return texts.map((text) => {
      const vector = new Array(dim).fill(0)
      for (let i = 0; i < text.length; i += 1) {
        const idx = i % dim
        vector[idx] += text.charCodeAt(i) % 10
      }
      return vector
    })
  }

  // 单文本 embedding，兼容旧调用
  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text])
    return results[0]
  }
}
