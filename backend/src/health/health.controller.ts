import { Controller, Get } from '@nestjs/common'
import { Public } from '../common/guards/public.decorator'

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }

  @Get('ready')
  @Public()
  ready() {
    return { status: 'ready' }
  }
}