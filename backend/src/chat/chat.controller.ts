import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
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
}
