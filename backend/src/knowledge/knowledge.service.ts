import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DocumentEntity } from './entities/document.entity'
import { DocumentChunkEntity } from './entities/document-chunk.entity'
import { EmbeddingService } from './embedding/embedding.service'
import { RagService } from './rag/rag.service'

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

  async uploadDocument(file: Express.Multer.File) {
    // 1. 保存文档元信息
    const document = await this.documentRepo.save({
      filename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      content: file.buffer.toString('utf-8'),
    })

    // 2. 分块并生成向量
    const chunks = this.splitIntoChunks(document.content || '', 500, 50)
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i]
      const embedding = await this.embeddingService.embed(chunk)
      await this.chunkRepo.save({
        documentId: document.id,
        content: chunk,
        chunkIndex: i,
        embedding,
      })
    }

    return document
  }

  async search(query: string, topK = 3) {
    return this.ragService.search(query, topK)
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
