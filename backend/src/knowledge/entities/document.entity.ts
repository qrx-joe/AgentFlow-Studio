import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// 文档实体：用于管理上传文件元信息
@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', name: 'knowledge_base_id', nullable: true })
  knowledgeBaseId?: string

  @Column({ type: 'varchar', length: 255 })
  filename!: string

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'file_type' })
  fileType?: string

  @Column({ type: 'int', nullable: true, name: 'file_size' })
  fileSize?: number

  @Column({ type: 'text', nullable: true })
  content?: string

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, any>

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date
}
