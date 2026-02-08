import { Controller, Delete, Get, Param, Post, Body, UseInterceptors, UploadedFile } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { KnowledgeService } from './knowledge.service'

// 知识库 API 控制器
@Controller('api/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('documents')
  listDocuments() {
    return this.knowledgeService.listDocuments()
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('chunkSize') chunkSize?: string,
    @Body('overlap') overlap?: string
  ) {
    return this.knowledgeService.uploadDocument(file, {
      chunkSize: chunkSize ? Number(chunkSize) : undefined,
      overlap: overlap ? Number(overlap) : undefined,
    })
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    return this.knowledgeService.deleteDocument(id)
  }

  @Post('search')
  search(@Body('query') query: string, @Body('topK') topK: number) {
    return this.knowledgeService.searchWithStats(query, topK || 3)
  }
}
