import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// 工作流执行记录：用于保存运行状态与日志
@Entity('workflow_executions')
export class WorkflowExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workflow_id' })
  workflowId!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: 'pending' | 'running' | 'completed' | 'failed';

  @Column({ type: 'json', nullable: true })
  input?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  output?: Record<string, any>;

  @Column({ type: 'json', default: () => "'[]'" })
  logs!: string[];

  @Column({ type: 'timestamp', name: 'started_at', default: () => 'CURRENT_TIMESTAMP' })
  startedAt!: Date;

  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage?: string;
}
