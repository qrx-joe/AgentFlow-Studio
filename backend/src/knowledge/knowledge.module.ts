import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { KnowledgeController } from './knowledge.controller'
import { KnowledgeService } from './knowledge.service'
import { DocumentEntity } from './entities/document.entity'
import { DocumentChunkEntity } from './entities/document-chunk.entity'
import { EmbeddingService } from './embedding/embedding.service'
import { RagService } from './rag/rag.service'
import { Bm25Service } from './rag/bm25.service'
import { KnowledgeSearchService } from './search/knowledge-search.service'
import { MetricsModule } from '../metrics/metrics.module'

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, DocumentChunkEntity]), MetricsModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, EmbeddingService, RagService, Bm25Service, KnowledgeSearchService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
