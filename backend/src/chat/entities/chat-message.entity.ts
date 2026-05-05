import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// 消息实体：存储用户与助手的消息
@Entity('chat_messages')
export class ChatMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'session_id' })
  sessionId!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: 'user' | 'assistant' | 'system';

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'json', default: () => "'[]'" })
  sources!: any;

  @Column({ type: 'json', default: () => "'{}'" })
  metadata!: any;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
