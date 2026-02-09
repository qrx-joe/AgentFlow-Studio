import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { redisStore } from 'cache-manager-redis-store'

@Module({
  imports: [
    CacheModule.register({
      store: redisStore as any,
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
      ttl: 60 * 5,
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule { }
