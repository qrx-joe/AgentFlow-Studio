import { IsArray, IsOptional, IsString } from 'class-validator'

// 创建工作流 DTO
export class CreateWorkflowDto {
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  description?: string

  @IsArray()
  nodes: any[]

  @IsArray()
  edges: any[]
}

// 更新工作流 DTO
export class UpdateWorkflowDto extends CreateWorkflowDto {}
