import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DocumentEntity } from './entities/document.entity'
import { DocumentChunkEntity } from './entities/document-chunk.entity'
import { KnowledgeBaseEntity, defaultKnowledgeBaseSettings, KnowledgeBaseSettings } from './entities/knowledge-base.entity'
import { EmbeddingService } from './embedding/embedding.service'
import { MetricsService } from '../metrics/metrics.service'
import { KnowledgeSearchService } from './search/knowledge-search.service'
import type { KnowledgeSearchOptions } from './types'
import { parseDocument, isSupportedFile, getSupportedFormats } from './utils/document-parser'

import { RecursiveCharacterTextSplitter } from './utils/text-splitter'

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(DocumentEntity) private documentRepo: Repository<DocumentEntity>,
    @InjectRepository(DocumentChunkEntity) private chunkRepo: Repository<DocumentChunkEntity>,
    @InjectRepository(KnowledgeBaseEntity) private kbRepo: Repository<KnowledgeBaseEntity>,
    private embeddingService: EmbeddingService,
    private searchService: KnowledgeSearchService,
    private metricsService: MetricsService
  ) { }

  // ========== 知识库管理 ==========

  async listKnowledgeBases() {
    const kbs = await this.kbRepo.find({ order: { createdAt: 'DESC' } })
    // 为每个知识库添加统计信息
    const result = await Promise.all(
      kbs.map(async (kb) => {
        const stats = await this.getKnowledgeBaseStats(kb.id)
        return { ...kb, ...stats }
      })
    )
    return result
  }

  async createKnowledgeBase(data: {
    name: string
    description?: string
    icon?: string
    color?: string
    settings?: Partial<KnowledgeBaseSettings>
  }) {
    const kb = this.kbRepo.create({
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      settings: { ...defaultKnowledgeBaseSettings, ...data.settings },
    })
    return this.kbRepo.save(kb)
  }

  async updateKnowledgeBase(id: string, data: {
    name?: string
    description?: string
    icon?: string
    color?: string
    settings?: Partial<KnowledgeBaseSettings>
  }) {
    const kb = await this.kbRepo.findOne({ where: { id } })
    if (!kb) return null

    const updateData: Partial<KnowledgeBaseEntity> = {
      updatedAt: new Date(),
    }
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.color !== undefined) updateData.color = data.color
    if (data.settings) {
      updateData.settings = { ...kb.settings, ...data.settings }
    }

    await this.kbRepo.update(id, updateData)
    return this.getKnowledgeBase(id)
  }

  async deleteKnowledgeBase(id: string) {
    // 删除知识库下的所有文档和分块
    const docs = await this.documentRepo.find({ where: { knowledgeBaseId: id } })
    for (const doc of docs) {
      await this.chunkRepo.delete({ documentId: doc.id })
      await this.documentRepo.delete(doc.id)
    }
    await this.kbRepo.delete(id)
    return { id }
  }

  async getKnowledgeBase(id: string) {
    const kb = await this.kbRepo.findOne({ where: { id } })
    if (!kb) return null
    const stats = await this.getKnowledgeBaseStats(id)
    return { ...kb, ...stats }
  }

  async getKnowledgeBaseStats(id: string) {
    const docs = await this.documentRepo.find({ where: { knowledgeBaseId: id } })
    const documentCount = docs.length
    const chunkCount = docs.reduce((sum, doc) => sum + (doc.metadata?.chunkCount || 0), 0)
    const totalChars = docs.reduce((sum, doc) => sum + (doc.metadata?.charCount || 0), 0)
    return { documentCount, chunkCount, totalChars }
  }

  // ========== 文档管理 ==========

  async listDocuments(knowledgeBaseId?: string) {
    const where = knowledgeBaseId ? { knowledgeBaseId } : {}
    return this.documentRepo.find({ where, order: { createdAt: 'DESC' } })
  }

  async listDocumentChunks(documentId: string, limit = 5) {
    return this.chunkRepo.find({
      where: { documentId },
      order: { chunkIndex: 'ASC' },
      take: limit,
    })
  }

  async deleteDocument(id: string) {
    await this.chunkRepo.delete({ documentId: id })
    await this.documentRepo.delete(id)
    return { id }
  }

  async uploadDocument(
    file: Express.Multer.File,
    options: { chunkSize?: number; overlap?: number; knowledgeBaseId?: string } = {}
  ) {
    const startTime = Date.now()
    const filename = this.normalizeFilename(file.originalname)

    console.log(`[KnowledgeService] Uploading document: ${filename}, mimetype: ${file.mimetype}, size: ${file.size} bytes`)

    // 检查文件类型是否支持
    if (!isSupportedFile(filename, file.mimetype)) {
      const supportedFormats = getSupportedFormats().join(', ')
      throw new Error(`不支持的文件格式。支持的格式: ${supportedFormats}`)
    }

    try {
      // 1. 解析文档内容
      const parsed = await parseDocument(file.buffer, filename, file.mimetype)

      if (!parsed.content || parsed.content.trim().length === 0) {
        throw new Error('文档内容为空或无法解析')
      }

      console.log(`[KnowledgeService] Parsed document: ${parsed.content.length} chars, format: ${parsed.metadata.format}`)

      // 2. 保存文档元信息
      const document = await this.documentRepo.save({
        filename,
        fileType: file.mimetype,
        fileSize: file.size,
        content: parsed.content,
        knowledgeBaseId: options.knowledgeBaseId,
        metadata: {
          chunkSize: options.chunkSize && options.chunkSize > 0 ? options.chunkSize : 500,
          overlap: options.overlap && options.overlap >= 0 ? options.overlap : 50,
          format: parsed.metadata.format,
          ...parsed.metadata,
        },
      })

      // 3. 分块并生成向量
      const chunkSize = options.chunkSize && options.chunkSize > 0 ? options.chunkSize : 500
      const chunkOverlap = options.overlap && options.overlap >= 0 ? options.overlap : 50
      const chunkStart = Date.now()

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
      })
      const chunks = splitter.splitText(parsed.content)

      const chunkMs = Date.now() - chunkStart
      const charCount = parsed.content.length
      const embedStart = Date.now()
      let embeddingDim = Number(process.env.EMBEDDING_DIMENSION || 1024)

      // 3.1 清理所有 chunk
      const cleanedChunks = chunks
        .map((chunk) =>
          chunk
            .replace(/\0/g, '')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            .trim()
        )
        .filter((chunk) => chunk.length > 0)

      // 3.2 批量生成向量（每批最多 2048 条，避免 API 限制）
      const batchSize = 2048
      const embeddings: number[][] = []

      for (let i = 0; i < cleanedChunks.length; i += batchSize) {
        const batch = cleanedChunks.slice(i, i + batchSize)
        const batchEmbeds = await this.embeddingService.embedBatch(batch)
        embeddings.push(...batchEmbeds)
      }

      if (embeddings.length > 0) {
        embeddingDim = embeddings[0].length
      }

      // 3.3 保存所有 chunk 到数据库
      const chunkEntities = cleanedChunks.map((content, i) => ({
        documentId: document.id,
        content,
        chunkIndex: i,
        embedding: embeddings[i],
      }))

      // 批量插入
      await this.chunkRepo.save(chunkEntities)

      const embedMs = Date.now() - embedStart

      console.log(`[KnowledgeService] Document processed: ${chunks.length} chunks, ${charCount} chars, ${Date.now() - startTime}ms`)

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
    } catch (error) {
      console.error('[KnowledgeService] Upload failed:', error)
      throw error
    }
  }

  async search(query: string, topK = 3, options: KnowledgeSearchOptions = {}) {
    const start = Date.now()
    const result = await this.searchService.search(query, topK, options)
    void this.metricsService.recordKnowledgeSearch(Date.now() - start)
    return result
  }

  /**
   * 规范化文件名，处理各种编码问题
   */
  private normalizeFilename(name: string): string {
    if (!name) return 'unnamed'

    // 尝试多种解码方式
    let decoded = name

    // 1. 检测并修复 UTF-8 被错误解析为 Latin-1 的情况
    const looksLatin1Encoded = /[\xc0-\xff][\x80-\xbf]/.test(name)
    if (looksLatin1Encoded) {
      try {
        decoded = Buffer.from(name, 'latin1').toString('utf8')
        if (decoded && !decoded.includes('�')) {
          return decoded
        }
      } catch {
        // 忽略解码错误
      }
    }

    // 2. 检测并修复 URL 编码
    if (name.includes('%')) {
      try {
        decoded = decodeURIComponent(name)
        if (decoded && !decoded.includes('�')) {
          return decoded
        }
      } catch {
        // 忽略解码错误
      }
    }

    // 3. 检测并修复双重 UTF-8 编码
    const looksMojibake = /[ÃÂ]/.test(name) || name.includes('�')
    if (looksMojibake) {
      try {
        // 尝试将 UTF-8 字节序列作为 Latin-1 解释后再转回 UTF-8
        const bytes = Buffer.from(name, 'utf8')
        decoded = bytes.toString('latin1')
        const reencoded = Buffer.from(decoded, 'latin1').toString('utf8')
        if (reencoded && !reencoded.includes('�') && reencoded !== name) {
          return reencoded
        }
      } catch {
        // 忽略解码错误
      }
    }

    // 4. 如果所有尝试都失败，返回原始名称（移除非法字符）
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
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
}
