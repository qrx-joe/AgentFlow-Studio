import { Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ChatService } from './chat.service'

// 对话 API 控制器
@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Get('sessions')
  listSessions() {
    return this.chatService.listSessions()
  }

  @Post('sessions')
  createSession() {
    return this.chatService.createSession()
  }

  @Get('sessions/:id/messages')
  listMessages(@Param('id') id: string) {
    return this.chatService.listMessages(id)
  }

  @Delete('sessions/:id')
  deleteSession(@Param('id') id: string) {
    return this.chatService.deleteSession(id)
  }

  @Post('messages')
  sendMessage(@Body() payload: { sessionId: string; content: string }) {
    return this.chatService.sendMessage(payload)
  }

  @Post('messages/stream')
  async streamMessage(
    @Body() payload: { sessionId: string; content: string },
    @Res() res: Response
  ) {
    // SSE 基本响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    // 禁用 Node.js 的响应缓冲
    res.socket?.setNoDelay(true)
    res.flushHeaders()

    const writeEvent = (event: string | null, data: string) => {
      if (!res.writable) return
      if (event) {
        res.write(`event: ${event}\n`)
      }
      const lines = data.split('\n')
      for (const line of lines) {
        res.write(`data: ${line}\n`)
      }
      res.write('\n')
      // 强制刷新缓冲区（通过写入空字符串触发）
      if (typeof (res as any).flush === 'function') {
        (res as any).flush()
      }
    }

    // 发送初始注释，确保连接尽快建立
    res.write(':ok\n\n')

    try {
      const assistant = await this.chatService.streamMessage(payload, (token) => {
        writeEvent(null, token)
      })

      writeEvent('done', JSON.stringify({ id: assistant.id, sources: assistant.sources }))
      res.end()
    } catch (error) {
      console.error('[ChatController] SSE stream error:', error)
      const errMsg = (error as any)?.message || '服务器内部错误'
      writeEvent('error', JSON.stringify({ message: errMsg }))
      res.end()
    }
  }
}
