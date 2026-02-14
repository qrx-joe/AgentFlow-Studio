import { IsArray, IsIn, IsOptional, IsString } from 'class-validator'

// 创建工作流 DTO
export class CreateWorkflowDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: string

  @IsOptional()
  @IsString()
  icon?: string

  @IsOptional()
  @IsString()
  color?: string

  @IsArray()
  nodes!: any[]

  @IsArray()
  edges!: any[]
}

// 更新工作流 DTO - 所有字段可选
export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: string

  @IsOptional()
  @IsString()
  icon?: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsArray()
  nodes?: any[]

  @IsOptional()
  @IsArray()
  edges?: any[]
}
