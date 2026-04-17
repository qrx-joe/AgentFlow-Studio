import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// 分块设置
export interface ChunkSettings {
  method: 'auto' | 'custom';
  chunkSize: number;
  overlap: number;
  separators?: string[];
}

// 检索设置
export interface RetrievalSettings {
  mode: 'vector' | 'fulltext' | 'hybrid';
  topK: number;
  scoreThreshold: number;
  rerank: boolean;
  rerankModel?: string;
  vectorWeight?: number;
  keywordWeight?: number;
}

// 知识库设置
export interface KnowledgeBaseSettings {
  embeddingModel?: string;
  chunk: ChunkSettings;
  retrieval: RetrievalSettings;
}

// 默认设置
export const defaultKnowledgeBaseSettings: KnowledgeBaseSettings = {
  embeddingModel: 'bge-m3',
  chunk: {
    method: 'auto',
    chunkSize: 500,
    overlap: 50,
  },
  retrieval: {
    mode: 'hybrid',
    topK: 5,
    scoreThreshold: 0.5,
    rerank: false,
    vectorWeight: 1,
    keywordWeight: 0.5,
  },
};

// 知识库实体：用于组织和管理文档集合
@Entity('knowledge_bases')
export class KnowledgeBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color?: string;

  @Column({ type: 'jsonb', default: () => `'${JSON.stringify(defaultKnowledgeBaseSettings)}'` })
  settings!: KnowledgeBaseSettings;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
