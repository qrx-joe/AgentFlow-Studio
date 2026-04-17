import { HttpException, HttpStatus } from '@nestjs/common';

// 业务异常：携带业务错误码
export class BusinessException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}

// 统一错误码，便于前端做差异化提示
export const ErrorCodes = {
  WORKFLOW_NOT_FOUND: 'WF001',
  WORKFLOW_EXECUTION_FAILED: 'WF002',
  WORKFLOW_CYCLE_DETECTED: 'WF003',
  WORKFLOW_INVALID: 'WF004',
  DOCUMENT_PARSE_FAILED: 'KB001',
  EMBEDDING_FAILED: 'KB002',
  LLM_API_ERROR: 'LLM001',
  LLM_TIMEOUT: 'LLM002',
};
