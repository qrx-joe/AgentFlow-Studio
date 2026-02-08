import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MetricsDailyEntity } from './entities/metrics-daily.entity'

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(MetricsDailyEntity)
    private metricsRepo: Repository<MetricsDailyEntity>
  ) {}

  async recordWorkflowExecution(durationMs: number, status: 'completed' | 'failed') {
    await this.updateDaily({
      workflowTotal: 1,
      workflowFailed: status === 'failed' ? 1 : 0,
      workflowDurationMs: durationMs,
    })
  }

  async recordKnowledgeSearch(durationMs: number) {
    await this.updateDaily({
      knowledgeTotal: 1,
      knowledgeDurationMs: durationMs,
    })
  }

  async recordRagCacheHit() {
    await this.updateDaily({ ragCacheHits: 1 })
  }

  async recordRagCacheMiss() {
    await this.updateDaily({ ragCacheMisses: 1 })
  }

  async getSummary(days = 7, thresholds?: { failureRate?: number; cacheHitRate?: number }) {
    const since = new Date()
    since.setDate(since.getDate() - days + 1)
    const sinceDate = since.toISOString().slice(0, 10)

    const rows = await this.metricsRepo
      .createQueryBuilder('metrics')
      .where('metrics.date >= :since', { since: sinceDate })
      .orderBy('metrics.date', 'ASC')
      .getMany()

    const totals = rows.reduce(
      (acc, row) => {
        acc.workflowTotal += Number(row.workflowTotal || 0)
        acc.workflowFailed += Number(row.workflowFailed || 0)
        acc.workflowDurationMs += Number(row.workflowDurationMs || 0)
        acc.knowledgeTotal += Number(row.knowledgeTotal || 0)
        acc.knowledgeDurationMs += Number(row.knowledgeDurationMs || 0)
        acc.ragCacheHits += Number(row.ragCacheHits || 0)
        acc.ragCacheMisses += Number(row.ragCacheMisses || 0)
        return acc
      },
      {
        workflowTotal: 0,
        workflowFailed: 0,
        workflowDurationMs: 0,
        knowledgeTotal: 0,
        knowledgeDurationMs: 0,
        ragCacheHits: 0,
        ragCacheMisses: 0,
      }
    )

    const workflowAvg = totals.workflowTotal
      ? Math.round(totals.workflowDurationMs / totals.workflowTotal)
      : 0
    const knowledgeAvg = totals.knowledgeTotal
      ? Math.round(totals.knowledgeDurationMs / totals.knowledgeTotal)
      : 0
    const cacheTotal = totals.ragCacheHits + totals.ragCacheMisses
    const cacheHitRate = cacheTotal ? totals.ragCacheHits / cacheTotal : 0

    const failureRate = totals.workflowTotal ? totals.workflowFailed / totals.workflowTotal : 0
    const alerts: Array<{ type: string; message: string }> = []
    if (thresholds?.failureRate !== undefined && failureRate > thresholds.failureRate) {
      alerts.push({ type: 'workflow', message: '工作流失败率超出阈值' })
    }
    if (thresholds?.cacheHitRate !== undefined && cacheHitRate < thresholds.cacheHitRate) {
      alerts.push({ type: 'ragCache', message: 'RAG 缓存命中率低于阈值' })
    }

    return {
      workflow: {
        total: totals.workflowTotal,
        failed: totals.workflowFailed,
        avgDurationMs: workflowAvg,
        failureRate: Number(failureRate.toFixed(4)),
      },
      knowledge: {
        total: totals.knowledgeTotal,
        avgDurationMs: knowledgeAvg,
      },
      ragCache: {
        hits: totals.ragCacheHits,
        misses: totals.ragCacheMisses,
        hitRate: Number(cacheHitRate.toFixed(4)),
      },
      daily: rows.map(row => ({
        date: row.date,
        workflowTotal: row.workflowTotal,
        workflowFailed: row.workflowFailed,
        workflowDurationMs: row.workflowDurationMs,
        knowledgeTotal: row.knowledgeTotal,
        knowledgeDurationMs: row.knowledgeDurationMs,
        ragCacheHits: row.ragCacheHits,
        ragCacheMisses: row.ragCacheMisses,
      })),
      alerts,
    }
  }

  private async updateDaily(delta: {
    workflowTotal?: number
    workflowFailed?: number
    workflowDurationMs?: number
    knowledgeTotal?: number
    knowledgeDurationMs?: number
    ragCacheHits?: number
    ragCacheMisses?: number
  }) {
    try {
      const date = new Date().toISOString().slice(0, 10)
      const values = {
        workflowTotal: delta.workflowTotal || 0,
        workflowFailed: delta.workflowFailed || 0,
        workflowDurationMs: delta.workflowDurationMs || 0,
        knowledgeTotal: delta.knowledgeTotal || 0,
        knowledgeDurationMs: delta.knowledgeDurationMs || 0,
        ragCacheHits: delta.ragCacheHits || 0,
        ragCacheMisses: delta.ragCacheMisses || 0,
      }

      await this.metricsRepo.query(
        `
        INSERT INTO metrics_daily (
          date,
          workflow_total,
          workflow_failed,
          workflow_duration_ms,
          knowledge_total,
          knowledge_duration_ms,
          rag_cache_hits,
          rag_cache_misses
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (date) DO UPDATE SET
          workflow_total = metrics_daily.workflow_total + EXCLUDED.workflow_total,
          workflow_failed = metrics_daily.workflow_failed + EXCLUDED.workflow_failed,
          workflow_duration_ms = metrics_daily.workflow_duration_ms + EXCLUDED.workflow_duration_ms,
          knowledge_total = metrics_daily.knowledge_total + EXCLUDED.knowledge_total,
          knowledge_duration_ms = metrics_daily.knowledge_duration_ms + EXCLUDED.knowledge_duration_ms,
          rag_cache_hits = metrics_daily.rag_cache_hits + EXCLUDED.rag_cache_hits,
          rag_cache_misses = metrics_daily.rag_cache_misses + EXCLUDED.rag_cache_misses
      `,
        [
          date,
          values.workflowTotal,
          values.workflowFailed,
          values.workflowDurationMs,
          values.knowledgeTotal,
          values.knowledgeDurationMs,
          values.ragCacheHits,
          values.ragCacheMisses,
        ]
      )
    } catch {
      // 避免指标写入影响主流程
    }
  }
}
