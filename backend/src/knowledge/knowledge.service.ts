import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DocumentEntity } from './entities/document.entity'
import { DocumentChunkEntity } from './entities/document-chunk.entity'
import { EmbeddingService } from './embedding/embedding.service'
import { MetricsService } from '../metrics/metrics.service'
import { KnowledgeSearchService } from './search/knowledge-search.service'
import type { KnowledgeSearchOptions } from './types'

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(DocumentEntity) private documentRepo: Repository<DocumentEntity>,
    @InjectRepository(DocumentChunkEntity) private chunkRepo: Repository<DocumentChunkEntity>,
    private embeddingService: EmbeddingService,
    private searchService: KnowledgeSearchService,
    private metricsService: MetricsService
  ) { }

  async listDocuments() {
    return this.documentRepo.find({ order: { createdAt: 'DESC' } })
  }

  async listDocumentChunks(documentId: string, limit = 5) {
    return this.chunkRepo.find({
      where: { documentId },
      order: { chunkIndex: 'ASC' },
      take: limit,
    })
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
    // 4. 更新元信息（分块数量、字符数）
    document.metadata = {
      ...document.metadata,
      chunkCount: chunks.length,
      charCount,
      chunkMs,
      embedMs,
      processMs: Date.now() - startTime,
      embeddingDim,
    }
    await this.documentRepo.save(document)

    return document
  }

  async search(query: string, topK = 3, options: KnowledgeSearchOptions = {}) {
    const start = Date.now()
    const result = await this.searchService.search(query, topK, options)
    void this.metricsService.recordKnowledgeSearch(Date.now() - start)
    return result
  }

  async searchWithStats(query: string, topK = 3, options: KnowledgeSearchOptions = {}) {
    const start = Date.now()
    const result = await this.searchService.searchWithStats(query, topK, options)
    void this.metricsService.recordKnowledgeSearch(Date.now() - start)
    return result
  }

  async evaluate(
    querySet: Array<{ query: string; expectedDocumentIds: string[] }>,
    options: KnowledgeSearchOptions,
    topK = 3
  ) {
    let hitCount = 0
    let mrrTotal = 0
    let evaluated = 0
    const perQuery: Array<{ query: string; rank?: number; hit: boolean }> = []

    for (const item of querySet) {
      if (!item.query || !item.expectedDocumentIds?.length) {
        continue
      }
      const result = await this.searchService.search(item.query, topK, options)
      const docIds = result.map(row => row.documentId)
      const hitIndex = docIds.findIndex(id => item.expectedDocumentIds.includes(id))
      evaluated += 1
      if (hitIndex >= 0) {
        hitCount += 1
        mrrTotal += 1 / (hitIndex + 1)
      }
      perQuery.push({
        query: item.query,
        rank: hitIndex >= 0 ? hitIndex + 1 : undefined,
        hit: hitIndex >= 0,
      })
    }

    return {
      hitRate: evaluated ? hitCount / evaluated : 0,
      mrr: evaluated ? mrrTotal / evaluated : 0,
      evaluated,
      perQuery,
    }
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
