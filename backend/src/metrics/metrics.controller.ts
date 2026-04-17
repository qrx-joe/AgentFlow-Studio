import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('api/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('summary')
  getSummary(
    @Query('days') days?: string,
    @Query('failureRate') failureRate?: string,
    @Query('cacheHitRate') cacheHitRate?: string,
  ) {
    const parsedDays = Number(days);
    const parsedFailure = Number(failureRate);
    const parsedCache = Number(cacheHitRate);
    return this.metricsService.getSummary(Number.isNaN(parsedDays) ? 7 : parsedDays, {
      failureRate: Number.isNaN(parsedFailure) ? undefined : parsedFailure,
      cacheHitRate: Number.isNaN(parsedCache) ? undefined : parsedCache,
    });
  }
}
