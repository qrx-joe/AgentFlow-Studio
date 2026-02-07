import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { WorkflowService } from './workflow.service'
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto'

// 工作流 API 控制器
@Controller('api/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  findAll() {
    return this.workflowService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateWorkflowDto) {
    return this.workflowService.create(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflowService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workflowService.remove(id)
  }

  @Post(':id/execute')
  execute(@Param('id') id: string, @Body('input') input: string) {
    return this.workflowService.execute(id, input)
  }

  @Get(':id/executions')
  listExecutions(@Param('id') id: string) {
    return this.workflowService.listExecutions(id)
  }
}
