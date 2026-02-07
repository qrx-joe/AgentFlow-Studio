import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DocumentChunkEntity } from '../entities/document-chunk.entity'
import { EmbeddingService } from '../embedding/embedding.service'
import type { SearchResult } from '../types'

// RAG 检索服务：使用 pgvector 进行相似度搜索
@Injectable()
export class RagService {
  constructor(
    @InjectRepository(DocumentChunkEntity)
    private chunkRepo: Repository<DocumentChunkEntity>,
    private embeddingService: EmbeddingService
  ) {}

  async search(query: string, topK = 3): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddingService.embed(query)

    // 使用原生 SQL 进行向量检索
    const results = await this.chunkRepo.query(
      `
      SELECT id, content, document_id,
             1 - (embedding <=> $1::vector) as similarity
      FROM document_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `,
      [JSON.stringify(queryEmbedding), topK]
    )

    return results.map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      content: row.content,
      similarity: Number(row.similarity),
    }))
  }
}
