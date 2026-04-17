import { Injectable, Logger } from '@nestjs/common';
import { createExecutionError } from '../types/error.types';

export interface CodeExecutionConfig {
  code: string;
  timeout?: number;
  memoryLimit?: number;
  allowedModules?: string[];
  context?: Record<string, any>;
}

export interface CodeExecutionResult {
  output: any;
  logs: string[];
  errors: string[];
  executionTime: number;
  memoryUsed?: number;
}

@Injectable()
export class CodeExecutionService {
  private readonly logger = new Logger(CodeExecutionService.name);
  private readonly defaultTimeout = 5000; // 5秒
  private readonly defaultMemoryLimit = 64 * 1024 * 1024; // 64MB

  /**
   * 执行 JavaScript 代码（安全沙箱模式）
   *
   * 注意：这是一个简化实现，使用 Function 构造器创建隔离环境
   * 生产环境建议使用 isolated-vm 或 Docker 沙箱
   */
  async execute(config: CodeExecutionConfig, nodeId: string): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const errors: string[] = [];

    try {
      // 验证代码安全性
      this.validateCode(config.code);

      // 创建安全的执行环境
      const timeout = config.timeout || this.defaultTimeout;
      const context = this.createSafeContext(config.context || {}, logs, errors);

      // 包装代码，添加超时和日志捕获
      const wrappedCode = this.wrapCode(config.code, timeout);

      this.logger.debug(`执行代码节点 ${nodeId}，超时: ${timeout}ms`);

      // 执行代码
      const output = await this.runWithTimeout(wrappedCode, context, timeout);

      const executionTime = Date.now() - startTime;

      this.logger.debug(`代码节点 ${nodeId} 执行完成，耗时: ${executionTime}ms`);

      return {
        output,
        logs,
        errors,
        executionTime,
      };
    } catch (error: any) {
      this.logger.error(`代码节点 ${nodeId} 执行失败: ${error.message}`);

      throw createExecutionError(`代码执行失败: ${error.message}`, nodeId, 'code', false, error);
    }
  }

  /**
   * 验证代码安全性
   * 检查危险操作和语法错误
   */
  private validateCode(code: string): void {
    // 检查是否包含危险的全局对象访问
    const dangerousPatterns = [
      /process\.exit/i,
      /child_process/i,
      /require\s*\(\s*['"]fs['"]\s*\)/i,
      /require\s*\(\s*['"]child_process['"]\s*\)/i,
      /require\s*\(\s*['"]os['"]\s*\)/i,
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(\s*function/i,
      /setInterval/i,
      /require\s*\(\s*[^'"`]*\)/i, // 动态 require
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`代码包含不安全的操作: ${pattern.toString()}`);
      }
    }

    // 检查基本语法
    try {
      new Function(code);
    } catch (syntaxError: any) {
      throw new Error(`语法错误: ${syntaxError.message}`);
    }
  }

  /**
   * 创建安全的执行上下文
   * 只暴露安全的全局对象和方法
   */
  private createSafeContext(
    userContext: Record<string, any>,
    logs: string[],
    errors: string[],
  ): Record<string, any> {
    // 安全的 console 实现
    const safeConsole = {
      log: (...args: any[]) => logs.push(args.map((a) => String(a)).join(' ')),
      error: (...args: any[]) => errors.push(args.map((a) => String(a)).join(' ')),
      warn: (...args: any[]) => logs.push(`[WARN] ${args.map((a) => String(a)).join(' ')}`),
      info: (...args: any[]) => logs.push(`[INFO] ${args.map((a) => String(a)).join(' ')}`),
    };

    // 安全的 Math 对象
    const safeMath = Object.create(Math);

    // 安全的 JSON 对象
    const safeJSON = JSON;

    // 安全的日期处理
    const safeDate = Date;

    // 安全的字符串/数组/对象方法
    return {
      // 用户提供的上下文变量
      ...userContext,

      // 安全的全局对象
      console: safeConsole,
      Math: safeMath,
      JSON: safeJSON,
      Date: safeDate,

      // 安全的工具函数
      encodeURI,
      encodeURIComponent,
      decodeURI,
      decodeURIComponent,
      escape,
      unescape,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,

      // 构造函数（限制功能）
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Error,
      TypeError,
      RangeError,
      SyntaxError,
      ReferenceError,

      // 禁止访问：process, require, global, Buffer, setTimeout, setInterval, clearTimeout, clearInterval
    };
  }

  /**
   * 包装用户代码，添加返回值处理和基本保护
   */
  private wrapCode(code: string, _timeout: number): string {
    return `
      (async function() {
        "use strict";
        try {
          // 禁止访问危险全局变量
          var process, require, global, Buffer, setTimeout, setInterval, clearTimeout, clearInterval;

          // 执行用户代码
          ${code}
        } catch (error) {
          throw error;
        }
      })()
    `;
  }

  /**
   * 在超时限制内执行代码
   */
  private async runWithTimeout(
    code: string,
    context: Record<string, any>,
    timeout: number,
  ): Promise<any> {
    // 创建函数
    const func = new Function(...Object.keys(context), `return (${code})`);

    // 创建超时 Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`代码执行超时（${timeout}ms）`));
      }, timeout);
    });

    // 竞争执行
    return Promise.race([func(...Object.values(context)), timeoutPromise]);
  }

  /**
   * 同步执行代码（简化版本，用于简单表达式）
   */
  executeSync(code: string, context: Record<string, any> = {}): any {
    try {
      this.validateCode(code);

      const func = new Function(...Object.keys(context), `"use strict"; ${code}`);

      return func(...Object.values(context));
    } catch (error: any) {
      throw new Error(`代码执行失败: ${error.message}`);
    }
  }
}
