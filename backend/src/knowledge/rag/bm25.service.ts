import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DocumentChunkEntity } from '../entities/document-chunk.entity'
import type { SearchResult } from '../types'

@Injectable()
export class Bm25Service {
  constructor(
    @InjectRepository(DocumentChunkEntity)
    private chunkRepo: Repository<DocumentChunkEntity>
  ) {}

  async applyBm25Scores(results: SearchResult[], keywords: string[]) {
    const trimmed = keywords
      .map(word => word.trim())
      .filter(Boolean)
      .map(word => word.slice(0, 50).toLowerCase())

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

    const dfMap = await this.getTermStats(trimmed)
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

  private async getTermStats(terms: string[]) {
    const rows = await this.chunkRepo.query(
      `SELECT term, df FROM rag_term_stats WHERE term = ANY($1)`,
      [terms]
    )

    const dfMap = new Map<string, number>()
    rows.forEach((row: any) => {
      dfMap.set(String(row.term), Number(row.df))
    })
    return dfMap
  }

  private countOccurrences(text: string, term: string) {
    if (!term) return 0
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'gi')
    const matches = text.match(regex)
    return matches ? matches.length : 0
  }
}
