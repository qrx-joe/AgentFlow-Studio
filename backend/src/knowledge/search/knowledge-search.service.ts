import { Injectable } from '@nestjs/common'
import { RagService } from '../rag/rag.service'

import type { KnowledgeSearchOptions, SearchResult } from '../types'

@Injectable()
export class KnowledgeSearchService {
  constructor(
    private ragService: RagService
  ) { }

  async search(query: string, topK = 3, options: KnowledgeSearchOptions = {}) {
    const optionsKey = this.buildSearchOptionsKey(options)
    const runKeyword = options.hybrid || (typeof options.keywordWeight === 'number' && options.keywordWeight > 0)
    const vectorResults = await this.ragService.search(query, topK, optionsKey)
    const keywordResults = runKeyword
      ? await this.ragService.searchKeyword(query, topK, optionsKey, options.keywordMode || 'tsrank')
      : []
    const merged = this.mergeResults(vectorResults, keywordResults)
    return this.applySearchOptions(merged, query, options)
  }

  async searchWithStats(query: string, topK = 3, options: KnowledgeSearchOptions = {}) {
    const optionsKey = this.buildSearchOptionsKey(options)
    const runKeyword = options.hybrid || (typeof options.keywordWeight === 'number' && options.keywordWeight > 0)
    const vectorResults = await this.ragService.search(query, topK, optionsKey)
    const keywordResults = runKeyword
      ? await this.ragService.searchKeyword(query, topK, optionsKey, options.keywordMode || 'tsrank')
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
      keywordMode: options.keywordMode || 'tsrank',
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
    const keywordWeight =
      typeof options.keywordWeight === 'number' ? options.keywordWeight : options.hybrid ? 0.1 : 0
    const keywordMode = options.keywordMode || 'tsrank'



    filtered = filtered.map(item => {
      const text = item.content || ''
      const keywordHits = keywords.reduce((count, word) => {
        return count + (text.includes(word) ? 1 : 0)
      }, 0)
      const keywordScore = item.keywordScore || 0
      const fusedScore = vectorWeight * (item.similarity || 0) + keywordWeight * keywordScore
      return {
        ...item,
        keywordHits,
        keywordScore,
        fusedScore,
      }
    })

    const useFusedThreshold = options.hybrid || keywordWeight > 0

    if (typeof options.scoreThreshold === 'number') {
      const scoreThreshold = options.scoreThreshold
      filtered = filtered.filter(item => {
        const score = useFusedThreshold ? item.fusedScore ?? 0 : item.similarity
        return score >= scoreThreshold
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
}
