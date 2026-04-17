import { Injectable } from '@nestjs/common';
import { RagService } from '../rag/rag.service';

import type { KnowledgeSearchOptions, SearchResult } from '../types';

interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
  query: string;
  options: string; // 序列化后的选项
}

@Injectable()
export class KnowledgeSearchService {
  // 查询缓存：相同查询在一定时间内直接返回缓存结果
  private queryCache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 缓存有效期：5分钟
  private readonly MAX_CACHE_SIZE = 100; // 最大缓存条目数

  constructor(private ragService: RagService) {}

  async search(query: string, topK = 3, options: KnowledgeSearchOptions = {}) {
    // 1. 检查缓存
    const cacheKey = this.buildCacheKey(query, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      // 缓存命中，直接返回（只取前 topK 条）
      return cached.slice(0, topK);
    }

    // 2. 执行检索
    const optionsKey = this.buildSearchOptionsKey(options);
    const runKeyword =
      options.hybrid || (typeof options.keywordWeight === 'number' && options.keywordWeight > 0);
    const vectorResults = await this.ragService.search(
      query,
      topK * 2,
      optionsKey,
      options.knowledgeBaseId,
    ); // 多取一些用于融合
    let keywordResults: SearchResult[] = [];
    if (runKeyword) {
      keywordResults = await this.ragService.searchKeyword(
        query,
        topK * 2,
        optionsKey,
        options.keywordMode || 'tsrank',
        options.knowledgeBaseId,
      );
    } else if (vectorResults.length < topK) {
      // 向量结果不足时，自动 fallback 到关键词搜索
      keywordResults = await this.ragService.searchKeyword(
        query,
        topK * 2,
        optionsKey,
        'trgm',
        options.knowledgeBaseId,
      );
    }

    // 3. 融合结果
    const merged = this.mergeResults(vectorResults, keywordResults);
    const results = await this.applySearchOptions(merged, query, options);

    // 4. 存入缓存
    this.setCache(cacheKey, results, query, options);

    // 5. 返回前 topK 条
    return results.slice(0, topK);
  }

  async searchWithStats(query: string, topK = 3, options: KnowledgeSearchOptions = {}) {
    const optionsKey = this.buildSearchOptionsKey(options);
    const runKeyword =
      options.hybrid || (typeof options.keywordWeight === 'number' && options.keywordWeight > 0);
    const vectorResults = await this.ragService.search(
      query,
      topK,
      optionsKey,
      options.knowledgeBaseId,
    );
    const keywordResults = runKeyword
      ? await this.ragService.searchKeyword(
          query,
          topK,
          optionsKey,
          options.keywordMode || 'tsrank',
          options.knowledgeBaseId,
        )
      : [];
    const merged = this.mergeResults(vectorResults, keywordResults);
    const filtered = await this.applySearchOptions(merged, query, options);
    return {
      total: merged.length,
      filtered: filtered.length,
      results: filtered,
    };
  }

  private buildSearchOptionsKey(options: KnowledgeSearchOptions) {
    const normalized = {
      scoreThreshold: typeof options.scoreThreshold === 'number' ? options.scoreThreshold : null,
      hybrid: Boolean(options.hybrid),
      rerank: Boolean(options.rerank),
      vectorWeight: typeof options.vectorWeight === 'number' ? options.vectorWeight : null,
      keywordWeight: typeof options.keywordWeight === 'number' ? options.keywordWeight : null,
      keywordMode: options.keywordMode || 'tsrank',
      knowledgeBaseId: options.knowledgeBaseId || null,
    };
    return Buffer.from(JSON.stringify(normalized)).toString('base64');
  }

  private async applySearchOptions(
    results: SearchResult[],
    query: string,
    options: KnowledgeSearchOptions,
  ) {
    let filtered: SearchResult[] = results;

    const keywords = query
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);

    // 如果启用了 hybrid 模式，使用 RRF 分数；否则使用原始相似度
    const useHybrid =
      options.hybrid || (typeof options.keywordWeight === 'number' && options.keywordWeight > 0);

    // 添加关键词命中统计（用于展示）
    filtered = filtered.map((item) => {
      const text = item.content || '';
      const keywordHits = keywords.reduce((count, word) => {
        return count + (text.toLowerCase().includes(word.toLowerCase()) ? 1 : 0);
      }, 0);
      return {
        ...item,
        keywordHits,
        // 统一使用 finalScore 作为最终排序依据
        finalScore: useHybrid ? (item.rrfScore ?? item.similarity ?? 0) : (item.similarity ?? 0),
      };
    });

    // 应用分数阈值过滤
    if (typeof options.scoreThreshold === 'number') {
      const scoreThreshold = options.scoreThreshold;
      filtered = filtered.filter((item) => {
        if (useHybrid) {
          // hybrid 模式下：有向量相似度的按向量相似度过滤；纯关键词命中的不过滤
          //（因为 keywordScore 范围不统一，且关键词匹配本身已是相关性强信号）
          if (typeof item.similarity === 'number') {
            return item.similarity >= scoreThreshold;
          }
          return true;
        }
        // 纯向量模式
        return (item.similarity ?? 0) >= scoreThreshold;
      });
    }

    // 最终排序（RRF 结果已经排序，这里再次确保）
    filtered = filtered.sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));

    return filtered;
  }

  /**
   * 构建缓存键
   */
  private buildCacheKey(query: string, options: KnowledgeSearchOptions): string {
    return `${query}:${this.buildSearchOptionsKey(options)}`;
  }

  /**
   * 从缓存获取结果
   */
  private getFromCache(key: string): SearchResult[] | null {
    const entry = this.queryCache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
      this.queryCache.delete(key);
      return null;
    }

    return entry.results;
  }

  /**
   * 存入缓存（带LRU清理）
   */
  private setCache(
    key: string,
    results: SearchResult[],
    query: string,
    options: KnowledgeSearchOptions,
  ) {
    // 如果缓存满了，清理最旧的条目
    if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
      let oldestKey = '';
      let oldestTime = Infinity;
      this.queryCache.forEach((entry, k) => {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = k;
        }
      });
      if (oldestKey) {
        this.queryCache.delete(oldestKey);
      }
    }

    this.queryCache.set(key, {
      results,
      timestamp: Date.now(),
      query,
      options: this.buildSearchOptionsKey(options),
    });
  }

  /**
   * 清理过期缓存（可定时调用）
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL_MS) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计（用于监控）
   */
  getCacheStats() {
    return {
      size: this.queryCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      ttlMs: this.CACHE_TTL_MS,
    };
  }

  /**
   * 使用 RRF (Reciprocal Rank Fusion) 算法融合向量检索和关键词检索结果
   * RRF 公式: score = 1 / (k + rank)
   * k 为平滑因子，通常取 60，用于降低高排名的主导作用
   */
  private mergeResults(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[],
  ): SearchResult[] {
    const k = 60; // RRF 平滑因子
    const rrfScores = new Map<string, number>();
    const resultMap = new Map<string, SearchResult>();

    // 构建ID到排名的映射
    const vectorRanks = new Map(vectorResults.map((r, i) => [r.id, i + 1]));
    const keywordRanks = new Map(keywordResults.map((r, i) => [r.id, i + 1]));

    // 收集所有结果ID
    const allIds = new Set([...vectorRanks.keys(), ...keywordRanks.keys()]);

    // 计算 RRF 分数
    allIds.forEach((id) => {
      const vectorRank = vectorRanks.get(id);
      const keywordRank = keywordRanks.get(id);

      let rrfScore = 0;

      // 向量检索贡献（如果存在）
      if (vectorRank) {
        rrfScore += 1 / (k + vectorRank);
      }

      // 关键词检索贡献（如果存在）
      if (keywordRank) {
        rrfScore += 1 / (k + keywordRank);
      }

      rrfScores.set(id, rrfScore);

      // 保留原始结果数据，优先使用向量结果（通常包含更多信息）
      const vectorResult = vectorResults.find((r) => r.id === id);
      const keywordResult = keywordResults.find((r) => r.id === id);

      resultMap.set(id, {
        ...(vectorResult || keywordResult)!,
        // 保存原始分数用于参考
        similarity: vectorResult?.similarity,
        keywordScore: keywordResult?.keywordScore,
        // RRF 融合分数
        rrfScore,
        // 同时保存排名信息用于调试
        vectorRank,
        keywordRank,
      } as SearchResult);
    });

    // 按 RRF 分数降序排序
    return Array.from(resultMap.values()).sort((a, b) => (b.rrfScore || 0) - (a.rrfScore || 0));
  }
}
