import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// 文档分块实体：用于向量检索
@Entity('document_chunks')
export class DocumentChunkEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'document_id' })
  documentId!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'int', name: 'chunk_index' })
  chunkIndex!: number;

  @Column({ type: 'vector', nullable: true })
  embedding?: number[];

  @Column({ type: 'json', default: () => "'{}'" })
  metadata!: Record<string, any>;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
