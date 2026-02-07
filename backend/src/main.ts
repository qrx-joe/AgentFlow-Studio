import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 开启跨域，便于前端本地访问
  app.enableCors()

  // 全局异常过滤器，统一返回结构
  app.useGlobalFilters(new AllExceptionsFilter())

  const port = process.env.PORT || 3001
  await app.listen(port)
}

bootstrap()
