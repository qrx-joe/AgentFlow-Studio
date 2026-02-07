import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// 工作流实体：存储节点与连线的 JSON
@Entity('workflows')
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({ type: 'jsonb', default: () => "'[]'" })
  nodes: any

  @Column({ type: 'jsonb', default: () => "'[]'" })
  edges: any

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date

  @Column({ type: 'timestamp', name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}
