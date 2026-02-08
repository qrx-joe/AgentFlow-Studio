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
    const optionsKey = this.buildSearchOptionsKey(options)
    const vectorResults = await this.ragService.search(query, topK, optionsKey)
    const keywordResults = this.shouldRunKeyword(options)
      ? await this.ragService.searchKeyword(query, topK, optionsKey)
      : []
    const merged = this.mergeResults(vectorResults, keywordResults)
    return this.applySearchOptions(merged, query, options)
  }

  async searchWithStats(query: string, topK = 3, options: KnowledgeSearchOptions = {}) {
    const optionsKey = this.buildSearchOptionsKey(options)
    const vectorResults = await this.ragService.search(query, topK, optionsKey)
    const keywordResults = this.shouldRunKeyword(options)
      ? await this.ragService.searchKeyword(query, topK, optionsKey)
      : []
    const merged = this.mergeResults(vectorResults, keywordResults)
    const filtered = await this.applySearchOptions(merged, query, options)
    return {
      total: merged.length,
      filtered: filtered.length,
      results: filtered,
    }
  }

  private buildSearchOptionsKey(options: KnowledgeSearchOptions) {
    const normalized = {
      scoreThreshold: typeof options.scoreThreshold === 'number' ? options.scoreThreshold : null,
      hybrid: Boolean(options.hybrid),
      rerank: Boolean(options.rerank),
      vectorWeight: typeof options.vectorWeight === 'number' ? options.vectorWeight : null,
      keywordWeight: typeof options.keywordWeight === 'number' ? options.keywordWeight : null,
      keywordMode: options.keywordMode || 'bm25',
    }
    return Buffer.from(JSON.stringify(normalized)).toString('base64')
  }

  private async applySearchOptions(
    results: SearchResult[],
    query: string,
    options: KnowledgeSearchOptions
  ) {
    let filtered: SearchResult[] = results

    const keywords = query
      .split(/\s+/)
      .map(word => word.trim())
      .filter(Boolean)

    const vectorWeight = typeof options.vectorWeight === 'number' ? options.vectorWeight : 1
    const keywordWeight = typeof options.keywordWeight === 'number' ? options.keywordWeight : 0.1
    const keywordMode = options.keywordMode || 'bm25'

    if (this.shouldRunKeyword(options) && keywordMode === 'bm25' && keywords.length > 0) {
      filtered = await this.applyBm25Scores(filtered, keywords)
    }

    filtered = filtered.map(item => {
      const keywordScore = item.keywordScore || 0
      const fusedScore = vectorWeight * (item.similarity || 0) + keywordWeight * keywordScore
      return {
        ...item,
        fusedScore,
      }
    })

    const useFusedThreshold = options.hybrid || keywordWeight > 0

    if (typeof options.scoreThreshold === 'number') {
      filtered = filtered.filter(item => {
        const score = useFusedThreshold ? item.fusedScore ?? 0 : item.similarity
        return score >= options.scoreThreshold
      })
    }

    if (options.rerank || options.hybrid) {
      filtered = [...filtered].sort((a, b) => {
        const aScore = a.fusedScore ?? a.similarity
        const bScore = b.fusedScore ?? b.similarity
        return bScore - aScore
      })
    }

    return filtered
  }

  private shouldRunKeyword(options: KnowledgeSearchOptions) {
    if (options.hybrid) return true
    if (typeof options.keywordWeight === 'number' && options.keywordWeight > 0) return true
    return false
  }

  private mergeResults(vectorResults: SearchResult[], keywordResults: SearchResult[]) {
    const merged = new Map<string, SearchResult>()
    vectorResults.forEach(item => {
      merged.set(item.id, { ...item })
    })
    keywordResults.forEach(item => {
      const existing = merged.get(item.id)
      if (existing) {
        merged.set(item.id, {
          ...existing,
          keywordScore: item.keywordScore ?? existing.keywordScore,
        })
      } else {
        merged.set(item.id, { ...item })
      }
    })
    return Array.from(merged.values())
  }

  private async applyBm25Scores(results: SearchResult[], keywords: string[]) {
    const trimmed = keywords
      .map(word => word.trim())
      .filter(Boolean)
      .map(word => word.slice(0, 50))

    if (trimmed.length === 0) {
      return results
    }

    const corpusStats = await this.chunkRepo.query(
      `SELECT COUNT(*)::int as total_docs, AVG(LENGTH(content))::float as avg_len FROM document_chunks`
    )

    const totalDocs = Number(corpusStats?.[0]?.total_docs || 0)
    const avgLen = Number(corpusStats?.[0]?.avg_len || 0)

    if (!totalDocs || !avgLen) {
      return results
    }

    const dfMap = new Map<string, number>()
    for (const term of trimmed) {
      const dfRows = await this.chunkRepo.query(
        `SELECT COUNT(*)::int as df FROM document_chunks WHERE content ILIKE $1`,
        [`%${term}%`]
      )
      const df = Number(dfRows?.[0]?.df || 0)
      dfMap.set(term, df)
    }

    const k1 = 1.5
    const b = 0.75

    return results.map(item => {
      const text = item.content || ''
      const dl = text.length || 1
      let score = 0
      for (const term of trimmed) {
        const df = dfMap.get(term) || 0
        if (!df) continue
        const tf = this.countOccurrences(text, term)
        if (!tf) continue
        const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1)
        const denom = tf + k1 * (1 - b + (b * dl) / avgLen)
        score += idf * ((tf * (k1 + 1)) / denom)
      }
      return {
        ...item,
        keywordScore: score,
      }
    })
  }

  private countOccurrences(text: string, term: string) {
    if (!term) return 0
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'gi')
    const matches = text.match(regex)
    return matches ? matches.length : 0
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
