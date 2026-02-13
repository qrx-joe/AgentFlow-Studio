import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'

// 全局异常过滤器：统一错误结构，便于前端处理
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter')

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest()

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const message = exception instanceof HttpException
      ? exception.message
      : '服务器内部错误'

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : ''
    )

    // 检查响应头是否已发送（SSE 流已开始）
    if (response.headersSent) {
      this.logger.warn('Headers already sent, cannot send error response')
      // SSE 流已开始，尝试通过流发送错误事件后关闭
      try {
        response.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
        response.end()
      } catch {
        // 忽略写入错误
      }
      return
    }

    response.status(status).json({
      code: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
