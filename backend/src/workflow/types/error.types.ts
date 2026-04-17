// 错误分级类型定义

export enum ErrorSeverity {
  /** 警告：可忽略，继续执行 */
  WARNING = 'warning',
  /** 可重试：临时错误，可以重试 */
  RETRYABLE = 'retryable',
  /** 致命：无法恢复，必须停止 */
  FATAL = 'fatal',
}

export enum ErrorCategory {
  /** 网络错误 */
  NETWORK = 'network',
  /** 超时错误 */
  TIMEOUT = 'timeout',
  /** 配置错误 */
  CONFIG = 'config',
  /** 执行错误 */
  EXECUTION = 'execution',
  /** 验证错误 */
  VALIDATION = 'validation',
  /** 资源错误 */
  RESOURCE = 'resource',
  /** 权限错误 */
  PERMISSION = 'permission',
  /** 未知错误 */
  UNKNOWN = 'unknown',
}

export interface WorkflowErrorDetails {
  /** 错误严重级别 */
  severity: ErrorSeverity;
  /** 错误分类 */
  category: ErrorCategory;
  /** 错误节点ID */
  nodeId: string;
  /** 错误节点类型 */
  nodeType: string;
  /** 是否可恢复 */
  recoverable: boolean;
  /** 建议的重试次数 */
  suggestedRetries?: number;
  /** 建议的重试延迟（毫秒） */
  suggestedRetryDelay?: number;
  /** 原始错误 */
  originalError?: Error;
  /** 错误上下文 */
  context?: Record<string, any>;
}

export class WorkflowError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly nodeId: string;
  public readonly nodeType: string;
  public readonly recoverable: boolean;
  public readonly suggestedRetries?: number;
  public readonly suggestedRetryDelay?: number;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;

  constructor(message: string, details: WorkflowErrorDetails) {
    super(message);
    this.name = 'WorkflowError';
    this.severity = details.severity;
    this.category = details.category;
    this.nodeId = details.nodeId;
    this.nodeType = details.nodeType;
    this.recoverable = details.recoverable;
    this.suggestedRetries = details.suggestedRetries;
    this.suggestedRetryDelay = details.suggestedRetryDelay;
    this.originalError = details.originalError;
    this.context = details.context;

    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkflowError);
    }
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(): boolean {
    return (
      this.severity === ErrorSeverity.RETRYABLE ||
      (this.severity === ErrorSeverity.WARNING && this.recoverable)
    );
  }

  /**
   * 转换为普通对象（用于序列化）
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      severity: this.severity,
      category: this.category,
      nodeId: this.nodeId,
      nodeType: this.nodeType,
      recoverable: this.recoverable,
      suggestedRetries: this.suggestedRetries,
      suggestedRetryDelay: this.suggestedRetryDelay,
      stack: this.stack,
      context: this.context,
    };
  }
}

/**
 * 创建网络错误
 */
export function createNetworkError(
  message: string,
  nodeId: string,
  nodeType: string,
  originalError?: Error,
): WorkflowError {
  return new WorkflowError(message, {
    severity: ErrorSeverity.RETRYABLE,
    category: ErrorCategory.NETWORK,
    nodeId,
    nodeType,
    recoverable: true,
    suggestedRetries: 3,
    suggestedRetryDelay: 1000,
    originalError,
  });
}

/**
 * 创建超时错误
 */
export function createTimeoutError(
  message: string,
  nodeId: string,
  nodeType: string,
  originalError?: Error,
): WorkflowError {
  return new WorkflowError(message, {
    severity: ErrorSeverity.RETRYABLE,
    category: ErrorCategory.TIMEOUT,
    nodeId,
    nodeType,
    recoverable: true,
    suggestedRetries: 2,
    suggestedRetryDelay: 2000,
    originalError,
  });
}

/**
 * 创建配置错误
 */
export function createConfigError(
  message: string,
  nodeId: string,
  nodeType: string,
  originalError?: Error,
): WorkflowError {
  return new WorkflowError(message, {
    severity: ErrorSeverity.FATAL,
    category: ErrorCategory.CONFIG,
    nodeId,
    nodeType,
    recoverable: false,
    originalError,
  });
}

/**
 * 创建执行错误
 */
export function createExecutionError(
  message: string,
  nodeId: string,
  nodeType: string,
  recoverable: boolean = false,
  originalError?: Error,
): WorkflowError {
  return new WorkflowError(message, {
    severity: recoverable ? ErrorSeverity.RETRYABLE : ErrorSeverity.FATAL,
    category: ErrorCategory.EXECUTION,
    nodeId,
    nodeType,
    recoverable,
    suggestedRetries: recoverable ? 1 : 0,
    originalError,
  });
}

/**
 * 创建验证错误
 */
export function createValidationError(
  message: string,
  nodeId: string,
  nodeType: string,
): WorkflowError {
  return new WorkflowError(message, {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VALIDATION,
    nodeId,
    nodeType,
    recoverable: true,
  });
}
