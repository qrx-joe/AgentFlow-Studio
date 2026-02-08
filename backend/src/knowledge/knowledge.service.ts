import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DocumentEntity } from './entities/document.entity'
import { DocumentChunkEntity } from './entities/document-chunk.entity'
import { EmbeddingService } from './embedding/embedding.service'
import { RagService } from './rag/rag.service'
import type { KnowledgeSearchOptions, SearchResult } from './types'

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(DocumentEntity) private documentRepo: Repository<DocumentEntity>,
    @InjectRepository(DocumentChunkEntity) private chunkRepo: Repository<DocumentChunkEntity>,
    private embeddingService: EmbeddingService,
    private ragService: RagService
  ) {}

  async listDocuments() {
    return this.documentRepo.find({ order: { createdAt: 'DESC' } })
  }

  async deleteDocument(id: string) {
    await this.documentRepo.delete(id)
    return { id }
  }

  async uploadDocument(
    file: Express.Multer.File,
    options: { chunkSize?: number; overlap?: number } = {}
  ) {
    const startTime = Date.now()
    // 1. 保存文档元信息
    const document = await this.documentRepo.save({
      filename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      content: file.buffer.toString('utf-8'),
      metadata: {
        chunkSize: options.chunkSize && options.chunkSize > 0 ? options.chunkSize : 500,
        overlap: options.overlap && options.overlap >= 0 ? options.overlap : 50,
      },
    })

    // 2. 分块并生成向量
    const chunkSize = options.chunkSize && options.chunkSize > 0 ? options.chunkSize : 500
    const overlap = options.overlap && options.overlap >= 0 ? options.overlap : 50
    const chunkStart = Date.now()
    const chunks = this.splitIntoChunks(document.content || '', chunkSize, overlap)
    const chunkMs = Date.now() - chunkStart
    const charCount = (document.content || '').length
    const embedStart = Date.now()
    let embeddingDim = Number(process.env.EMBEDDING_DIMENSION || 1536)
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i]
      const embedding = await this.embeddingService.embed(chunk)
      if (Array.isArray(embedding) && embedding.length > 0) {
        embeddingDim = embedding.length
      }
      await this.chunkRepo.save({
        documentId: document.id,
        content: chunk,
        chunkIndex: i,
        embedding,
      })
    }
    const embedMs = Date.now() - embedStart

    // 4. 更新元信息（分块数量、字符数）
    await this.documentRepo.update(document.id, {
      metadata: {
        ...document.metadata,
        chunkCount: chunks.length,
        charCount,
        chunkMs,
        embedMs,
        processMs: Date.now() - startTime,
        embeddingDim,
      },
    })

    return document
  }

  async search(query: string, topK = 3, options: KnowledgeSearchOptions = {}) {
    const results = await this.ragService.search(query, topK)
    return this.applySearchOptions(results, query, options)
  }

  async searchWithStats(query: string, topK = 3, options: KnowledgeSearchOptions = {}) {
    const results = await this.ragService.search(query, topK)
    const filtered = this.applySearchOptions(results, query, options)
    return {
      total: results.length,
      filtered: filtered.length,
      results: filtered,
    }
  }

  private applySearchOptions(
    results: SearchResult[],
    query: string,
    options: KnowledgeSearchOptions
  ) {
    let filtered: SearchResult[] = results

    // 相似度阈值过滤
    if (typeof options.scoreThreshold === 'number') {
      filtered = filtered.filter(item => item.similarity >= options.scoreThreshold)
    }

    // 混合检索：引入简单关键词匹配分
    if (options.hybrid) {
      const keywords = query
        .split(/\s+/)
        .map(word => word.trim())
        .filter(Boolean)

      filtered = filtered.map(item => {
        const text = item.content || ''
        const keywordHits = keywords.reduce((count, word) => {
          return count + (text.includes(word) ? 1 : 0)
        }, 0)
        const keywordScore = keywords.length > 0 ? keywordHits / keywords.length : 0
        return { ...item, similarity: item.similarity + keywordScore * 0.1 }
      })
    }

    // 重排序：按融合分数降序
    if (options.rerank || options.hybrid) {
      filtered = [...filtered].sort((a, b) => b.similarity - a.similarity)
    }

    return filtered
  }

  // 文本分块：固定长度 + 重叠窗口
  private splitIntoChunks(text: string, size: number, overlap: number) {
    const chunks: string[] = []
    let start = 0
    while (start < text.length) {
      const end = Math.min(start + size, text.length)
      chunks.push(text.slice(start, end))
      start = end - overlap
    }
    return chunks
  }
}
