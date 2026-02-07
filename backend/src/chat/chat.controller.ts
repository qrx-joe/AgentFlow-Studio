import { Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ChatService } from './chat.service'

// 对话 API 控制器
@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const assistant = await this.chatService.streamMessage(payload, (token) => {
      res.write(`data: ${token}\n\n`)
    })

    // 发送结束事件，包含溯源信息
    res.write(`event: done\n`)
    res.write(`data: ${JSON.stringify({ id: assistant.id, sources: assistant.sources })}\n\n`)
    res.end()
  }
}
