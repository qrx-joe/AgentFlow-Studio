import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { KnowledgeController } from './knowledge.controller'
import { KnowledgeService } from './knowledge.service'
import { DocumentEntity } from './entities/document.entity'
import { DocumentChunkEntity } from './entities/document-chunk.entity'
import { EmbeddingService } from './embedding/embedding.service'
import { RagService } from './rag/rag.service'

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, DocumentChunkEntity])],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, EmbeddingService, RagService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
