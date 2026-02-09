import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('metrics_daily')
export class MetricsDailyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'date', unique: true })
  date!: string

  @Column({ name: 'workflow_total', type: 'int', default: 0 })
  workflowTotal!: number

  @Column({ name: 'workflow_failed', type: 'int', default: 0 })
  workflowFailed!: number

  @Column({ name: 'workflow_duration_ms', type: 'bigint', default: 0 })
  workflowDurationMs!: number

  @Column({ name: 'knowledge_total', type: 'int', default: 0 })
  knowledgeTotal!: number

  @Column({ name: 'knowledge_duration_ms', type: 'bigint', default: 0 })
  knowledgeDurationMs!: number

  @Column({ name: 'rag_cache_hits', type: 'int', default: 0 })
  ragCacheHits!: number

  @Column({ name: 'rag_cache_misses', type: 'int', default: 0 })
  ragCacheMisses!: number
}
