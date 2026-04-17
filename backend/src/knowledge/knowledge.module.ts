import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { DocumentEntity } from './entities/document.entity';
import { DocumentChunkEntity } from './entities/document-chunk.entity';
import { KnowledgeBaseEntity } from './entities/knowledge-base.entity';
import { EmbeddingService } from './embedding/embedding.service';
import { RagService } from './rag/rag.service';

import { KnowledgeSearchService } from './search/knowledge-search.service';
import { MetricsModule } from '../metrics/metrics.module';
import { AppCacheModule } from '../common/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity, DocumentChunkEntity, KnowledgeBaseEntity]),
    MetricsModule,
    AppCacheModule,
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, EmbeddingService, RagService, KnowledgeSearchService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
