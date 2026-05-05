import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { parse } from 'pg-connection-string';

import { CommonModule } from './common/common.module';
import { WorkflowModule } from './workflow/workflow.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { ChatModule } from './chat/chat.module';
import { AgentModule } from './agent/agent.module';
import { AppCacheModule } from './common/cache/cache.module';
import { MetricsModule } from './metrics/metrics.module';
import { HealthModule } from './health/health.module';

// 辅助函数：判断是否为SQLite
const isSQLiteDb = (url?: string) => url?.includes('.sqlite') || url?.startsWith('./');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    CommonModule,

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL') || './data.sqlite';
        const isSQLite = isSQLiteDb(databaseUrl);
        const isDev = configService.get('NODE_ENV') === 'development';

        if (isSQLite) {
          console.log('[Database] Using SQLite:', databaseUrl);
          return {
            type: 'sqlite' as const,
            database: databaseUrl,
            autoLoadEntities: true,
            synchronize: true, // SQLite测试环境自动同步
            logging: isDev,
          };
        }

        console.log('[Database] Using PostgreSQL');
        // 解析PostgreSQL连接字符串
        const dbConfig = parse(databaseUrl);

        return {
          type: 'postgres' as const,
          host: dbConfig.host || undefined,
          port: dbConfig.port ? parseInt(dbConfig.port) : undefined,
          username: dbConfig.user || undefined,
          password: dbConfig.password || undefined,
          database: dbConfig.database || undefined,
          autoLoadEntities: true,
          synchronize: true, // 开发环境自动同步，生产环境务必关闭
          ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
          logging: isDev,
          extra: {
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
          },
          retryAttempts: 5,
          retryDelay: 5000,
        };
      },
      inject: [ConfigService],
    }),

    AppCacheModule,

    WorkflowModule,
    KnowledgeModule,
    ChatModule,
    AgentModule,
    MetricsModule,
    HealthModule,
  ],
})
export class AppModule {}
