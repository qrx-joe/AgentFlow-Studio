import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'

async function bootstrap() {
  try {
    console.log('[Bootstrap] Starting application...')
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    })

    console.log('[Bootstrap] Application created.')

    // 开启跨域，便于前端本地访问
    app.enableCors()
    console.log('[Bootstrap] CORS enabled.')

    // 全局异常过滤器，统一返回结构
    app.useGlobalFilters(new AllExceptionsFilter())

    const port = process.env.PORT || 3000
    console.log(`[Bootstrap] Attempting to listen on port ${port}...`)
    await app.listen(port)
    console.log(`[Bootstrap] Application listening on port ${port}`)
  } catch (err) {
    console.error('[Bootstrap] Error during startup:', err)
    process.exit(1)
  }
}

bootstrap()
