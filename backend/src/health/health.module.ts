import { Module } from '@nestjs/common';
import { Public } from '../common/guards/public.decorator';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}

export { Public };
