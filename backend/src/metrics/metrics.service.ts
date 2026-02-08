import { Injectable } from '@nestjs/common'

@Injectable()
export class MetricsService {
  private workflowExecutions = 0
  private workflowFailures = 0
  private workflowDurationMs = 0

  private knowledgeSearches = 0
  private knowledgeDurationMs = 0

  private ragCacheHits = 0
  private ragCacheMisses = 0

  recordWorkflowExecution(durationMs: number, status: 'completed' | 'failed') {
    this.workflowExecutions += 1
    this.workflowDurationMs += durationMs
    if (status === 'failed') {
      this.workflowFailures += 1
    }
  }

  recordKnowledgeSearch(durationMs: number) {
    this.knowledgeSearches += 1
    this.knowledgeDurationMs += durationMs
  }

  recordRagCacheHit() {
    this.ragCacheHits += 1
  }

  recordRagCacheMiss() {
    this.ragCacheMisses += 1
  }

  getSummary() {
    const workflowAvg = this.workflowExecutions
      ? Math.round(this.workflowDurationMs / this.workflowExecutions)
      : 0
    const knowledgeAvg = this.knowledgeSearches
      ? Math.round(this.knowledgeDurationMs / this.knowledgeSearches)
      : 0
    const cacheTotal = this.ragCacheHits + this.ragCacheMisses
    const cacheHitRate = cacheTotal ? this.ragCacheHits / cacheTotal : 0

    return {
      workflow: {
        total: this.workflowExecutions,
        failed: this.workflowFailures,
        avgDurationMs: workflowAvg,
      },
      knowledge: {
        total: this.knowledgeSearches,
        avgDurationMs: knowledgeAvg,
      },
      ragCache: {
        hits: this.ragCacheHits,
        misses: this.ragCacheMisses,
        hitRate: Number(cacheHitRate.toFixed(4)),
      },
    }
  }
}
