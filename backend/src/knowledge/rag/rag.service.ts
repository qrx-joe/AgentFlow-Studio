import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentChunkEntity } from '../entities/document-chunk.entity';
import { EmbeddingService } from '../embedding/embedding.service';
import type { SearchResult } from '../types';
import { MetricsService } from '../../metrics/metrics.service';

// RAG 检索服务：使用 pgvector 进行相似度搜索
@Injectable()
export class RagService {
  private memoryCache = new Map<string, { value: SearchResult[]; expiresAt: number }>();
  private memoryTtlMs = 60_000;
  private memoryMax = 200;

  constructor(
    @InjectRepository(DocumentChunkEntity)
    private chunkRepo: Repository<DocumentChunkEntity>,
    private embeddingService: EmbeddingService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private metricsService: MetricsService,
  ) {}

  async search(query: string, topK = 3, cacheKeySuffix = ''): Promise<SearchResult[]> {
    const suffix = cacheKeySuffix ? `:${cacheKeySuffix}` : '';
    const cacheKey = `rag:${Buffer.from(`${topK}:${query}${suffix}`).toString('base64')}`;

    const memoryHit = this.readMemoryCache(cacheKey);
    if (memoryHit) {
      void this.metricsService.recordRagCacheHit();
      return memoryHit;
    }

    const cached = await this.cacheManager.get<SearchResult[]>(cacheKey);
    if (cached) {
      this.writeMemoryCache(cacheKey, cached);
      void this.metricsService.recordRagCacheHit();
      return cached;
    }
    void this.metricsService.recordRagCacheMiss();

    const queryEmbedding = await this.embeddingService.embed(query);

    // 使用原生 SQL 进行向量检索
    const results = await this.chunkRepo.query(
      `
      SELECT id, content, document_id,
             1 - (embedding <=> $1::vector) as similarity
      FROM document_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `,
      [JSON.stringify(queryEmbedding), topK],
    );

    const mapped = results
      .map((row: any) => ({
        id: row.id,
        documentId: row.document_id,
        content: row.content,
        similarity: Number(row.similarity),
      }))
      .filter((row: { similarity: number }) => row.similarity > 0.1);

    this.writeMemoryCache(cacheKey, mapped);
    await this.cacheManager.set(cacheKey, mapped, 300);

    return mapped;
  }

  async searchKeyword(
    query: string,
    topK = 3,
    cacheKeySuffix = '',
    mode: 'bm25' | 'tsrank' | 'trgm' = 'bm25',
  ): Promise<SearchResult[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const suffix = cacheKeySuffix ? `:${cacheKeySuffix}` : '';
    const cacheKey = `ragkw:${Buffer.from(`${topK}:${query}${suffix}`).toString('base64')}`;

    const memoryHit = this.readMemoryCache(cacheKey);
    if (memoryHit) {
      void this.metricsService.recordRagCacheHit();
      return memoryHit;
    }

    const cached = await this.cacheManager.get<SearchResult[]>(cacheKey);
    if (cached) {
      this.writeMemoryCache(cacheKey, cached);
      this.metricsService.recordRagCacheHit();
      return cached;
    }
    void this.metricsService.recordRagCacheMiss();

    const results =
      mode === 'trgm'
        ? await this.chunkRepo.query(
            `
            SELECT id, content, document_id,
                   similarity(content, $2) as keyword_score
            FROM document_chunks
            WHERE content ILIKE $3
            ORDER BY keyword_score DESC
            LIMIT $1
          `,
            [topK, query, `%${query}%`],
          )
        : await this.chunkRepo.query(
            `
            SELECT id, content, document_id,
                   ${mode === 'tsrank' ? 'ts_rank' : 'ts_rank_cd'}(to_tsvector('simple', content), plainto_tsquery('simple', $2)) as keyword_score
            FROM document_chunks
            WHERE to_tsvector('simple', content) @@ plainto_tsquery('simple', $2)
            ORDER BY keyword_score DESC
            LIMIT $1
          `,
            [topK, query],
          );

    const mapped = results.map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      content: row.content,
      similarity: 0,
      keywordScore: Number(row.keyword_score) || 0,
    }));

    this.writeMemoryCache(cacheKey, mapped);
    await this.cacheManager.set(cacheKey, mapped, 300);

    return mapped;
  }

  private readMemoryCache(key: string) {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return undefined;
    }
    this.memoryCache.delete(key);
    this.memoryCache.set(key, entry);
    return entry.value;
  }

  private writeMemoryCache(key: string, value: SearchResult[]) {
    this.memoryCache.set(key, { value, expiresAt: Date.now() + this.memoryTtlMs });
    if (this.memoryCache.size > this.memoryMax) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
  }
}
