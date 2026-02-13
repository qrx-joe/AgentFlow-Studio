import { Controller, Delete, Get, Param, Post, Put, Body, UseInterceptors, UploadedFile, Query } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { KnowledgeService } from './knowledge.service'

// 知识库 API 控制器
@Controller('api/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) { }

  // ========== 知识库管理 ==========

  @Get('bases')
  listKnowledgeBases() {
    return this.knowledgeService.listKnowledgeBases()
  }

  @Post('bases')
  createKnowledgeBase(@Body() body: {
    name: string
    description?: string
    icon?: string
    color?: string
  }) {
    return this.knowledgeService.createKnowledgeBase(body)
  }

  @Get('bases/:id')
  getKnowledgeBase(@Param('id') id: string) {
    return this.knowledgeService.getKnowledgeBase(id)
  }

  @Put('bases/:id')
  updateKnowledgeBase(@Param('id') id: string, @Body() body: {
    name?: string
    description?: string
    icon?: string
    color?: string
    settings?: any
  }) {
    return this.knowledgeService.updateKnowledgeBase(id, body)
  }

  @Delete('bases/:id')
  deleteKnowledgeBase(@Param('id') id: string) {
    return this.knowledgeService.deleteKnowledgeBase(id)
  }

  // ========== 文档管理 ==========

  @Get('documents')
  listDocuments(@Query('knowledgeBaseId') knowledgeBaseId?: string) {
    return this.knowledgeService.listDocuments(knowledgeBaseId)
  }

  @Get('documents/:id/chunks')
  listDocumentChunks(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.knowledgeService.listDocumentChunks(id, limit ? Number(limit) : 5)
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('chunkSize') chunkSize?: string,
    @Body('overlap') overlap?: string,
    @Body('knowledgeBaseId') knowledgeBaseId?: string
  ) {
    console.log('[Upload] Received request:', {
      hasFile: !!file,
      filename: file?.originalname,
      size: file?.size,
      mimetype: file?.mimetype,
      chunkSize,
      overlap,
      knowledgeBaseId,
    })
    if (!file) {
      console.error('[Upload] No file received! Check multipart form data.')
      throw new Error('未收到文件，请检查上传请求')
    }
    try {
      const result = await this.knowledgeService.uploadDocument(file, {
        chunkSize: chunkSize ? Number(chunkSize) : undefined,
        overlap: overlap ? Number(overlap) : undefined,
        knowledgeBaseId,
      })
      console.log('[Upload] Success:', result.id)
      return result
    } catch (err) {
      console.error('[Upload] Error:', err)
      throw err
    }
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    return this.knowledgeService.deleteDocument(id)
  }

  @Post('search')
  search(
    @Body('query') query: string,
    @Body('topK') topK: number,
    @Body('scoreThreshold') scoreThreshold?: number,
    @Body('hybrid') hybrid?: boolean,
    @Body('rerank') rerank?: boolean,
    @Body('vectorWeight') vectorWeight?: number,
    @Body('keywordWeight') keywordWeight?: number,
    @Body('keywordMode') keywordMode?: 'bm25' | 'tsrank' | 'trgm'
  ) {
    return this.knowledgeService.searchWithStats(query, topK || 3, {
      scoreThreshold,
      hybrid,
      rerank,
      vectorWeight,
      keywordWeight,
      keywordMode,
    })
  }

  @Post('eval')
  async evaluate(
    @Body('queries') queries: Array<{ query: string; expectedDocumentIds: string[] }>,
    @Body('topK') topK?: number,
    @Body('baseline') baseline?: {
      scoreThreshold?: number
      hybrid?: boolean
      rerank?: boolean
      vectorWeight?: number
      keywordWeight?: number
      keywordMode?: 'bm25' | 'tsrank' | 'trgm'
    },
    @Body('compare') compare?: {
      scoreThreshold?: number
      hybrid?: boolean
      rerank?: boolean
      vectorWeight?: number
      keywordWeight?: number
      keywordMode?: 'bm25' | 'tsrank' | 'trgm'
    }
  ) {
    const baselineResult = await this.knowledgeService.evaluate(queries || [], baseline || {}, topK || 3)
    const compareResult = compare
      ? await this.knowledgeService.evaluate(queries || [], compare, topK || 3)
      : null

    return {
      baseline: baselineResult,
      compare: compareResult,
    }
  }
}
