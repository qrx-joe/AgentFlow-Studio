import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

// Embedding 服务：优先使用真实 API，缺省时使用简化向量
@Injectable()
export class EmbeddingService {
  private client?: OpenAI;

  constructor() {
    // 优先使用单独的 Embedding API 配置，否则回退到 OpenAI 配置
    const apiKey = process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.EMBEDDING_BASE_URL || process.env.OPENAI_BASE_URL;

    // 只有在有 API Key 且 baseURL 支持 embedding 时才初始化客户端
    // DeepSeek 等非 OpenAI 服务可能不支持 embedding，此时跳过
    const skipEmbeddingApi = process.env.SKIP_EMBEDDING_API === 'true';

    if (apiKey && !skipEmbeddingApi) {
      this.client = new OpenAI({
        apiKey,
        baseURL,
      });
    }
  }

  // 批量生成 embedding，支持大量文本
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const skip = process.env.SKIP_EMBEDDING_API === 'true';

    if (this.client && !skip) {
      try {
        const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
        const allEmbeddings: number[][] = [];

        // 按条数和总字符数双重限制分批，避免 API 413 Payload Too Large
        // SiliconFlow 等国内平台网关限制较严，保守设置
        const MAX_BATCH_ITEMS = 16;
        const MAX_BATCH_CHARS = 30_000;

        let i = 0;
        let batchIndex = 0;
        while (i < texts.length) {
          let batchChars = 0;
          let batchEnd = i;
          while (
            batchEnd < texts.length &&
            batchEnd - i < MAX_BATCH_ITEMS &&
            batchChars + texts[batchEnd].length <= MAX_BATCH_CHARS
          ) {
            batchChars += texts[batchEnd].length;
            batchEnd++;
          }

          const batch = texts.slice(i, batchEnd);
          console.log(
            `[EmbeddingService] Processing batch ${batchIndex + 1}: items=${batch.length}, chars=${batchChars}`,
          );
          const response = await this.client.embeddings.create({
            model,
            input: batch,
          });
          const sorted = response.data.sort((a, b) => a.index - b.index);
          const batchEmbeds = sorted.map((d) => d.embedding as number[]);
          allEmbeddings.push(...batchEmbeds);

          i = batchEnd;
          batchIndex++;
        }

        return allEmbeddings;
      } catch (err) {
        console.error('[EmbeddingService] Batch API 调用失败:', (err as Error).message);
        throw new Error(`Embedding API 调用失败: ${(err as Error).message}`);
      }
    }

    // 无 API 配置时降级为伪向量（仅用于本地演示，切勿与真实向量混用）
    const dim = Number(process.env.EMBEDDING_DIMENSION || 1536);
    return texts.map((text) => {
      const vector = new Array(dim).fill(0);
      const lower = text.toLowerCase();
      for (let i = 0; i < lower.length; i += 1) {
        const code = lower.charCodeAt(i);
        // 单字特征
        const idx1 = code % dim;
        vector[idx1] += (code % 100) / 100;
        // 双字特征（bigram）
        if (i > 0) {
          const prev = lower.charCodeAt(i - 1);
          const idx2 = (((code * 31 + prev) % dim) + dim) % dim;
          vector[idx2] += 0.5;
        }
        // 位置加权
        const idx3 = (((code * 17 + i) % dim) + dim) % dim;
        vector[idx3] += 0.3;
      }
      // L2 归一化，使余弦距离更有意义
      const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      if (norm > 0) {
        for (let i = 0; i < dim; i += 1) {
          vector[i] /= norm;
        }
      }
      return vector;
    });
  }

  // 单文本 embedding，兼容旧调用
  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }
}
