import { Injectable, Logger } from '@nestjs/common'
import axios, { AxiosRequestConfig, AxiosResponse, Method } from 'axios'
import { HttpNodeConfig, HttpResponse } from '../types'

@Injectable()
export class WorkflowHttpService {
  private readonly logger = new Logger(WorkflowHttpService.name)

  /**
   * 执行 HTTP 请求
   */
  async execute(config: HttpNodeConfig): Promise<HttpResponse> {
    const startTime = Date.now()
    const { url, method = 'GET', headers = {}, body, timeout = 30000, retries = 0, retryDelay = 1000 } = config

    this.logger.debug(`执行 HTTP 请求: ${method} ${url}`)

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const axiosConfig: AxiosRequestConfig = {
          url,
          method: method as Method,
          headers: this.sanitizeHeaders(headers),
          timeout,
          validateStatus: config.validateStatus || ((status) => status >= 200 && status < 300),
        }

        // 添加请求体（仅对非 GET/HEAD 请求）
        if (body && method !== 'GET' && method !== 'HEAD') {
          if (typeof body === 'string') {
            axiosConfig.data = body
          } else {
            axiosConfig.data = body
            // 如果没有 Content-Type，自动设置为 application/json
            if (!axiosConfig.headers!['Content-Type']) {
              axiosConfig.headers!['Content-Type'] = 'application/json'
            }
          }
        }

        const response: AxiosResponse = await axios(axiosConfig)
        const duration = Date.now() - startTime

        this.logger.debug(`HTTP 请求成功: ${method} ${url} -> ${response.status} (${duration}ms)`)

        return {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
          data: response.data,
          duration,
        }
      } catch (error: any) {
        lastError = error
        const isLastAttempt = attempt === retries

        if (isLastAttempt) {
          break
        }

        // 判断是否应该重试
        if (this.shouldRetry(error)) {
          this.logger.warn(`HTTP 请求失败，${retryDelay}ms 后重试 (${attempt + 1}/${retries + 1}): ${error.message}`)
          await this.sleep(retryDelay)
        } else {
          // 不可重试的错误直接抛出
          break
        }
      }
    }

    // 所有重试都失败
    const duration = Date.now() - startTime
    this.logger.error(`HTTP 请求最终失败: ${method} ${url} (${duration}ms) - ${lastError?.message}`)

    throw this.formatError(lastError!)
  }

  /**
   * 替换 URL 和 Body 中的变量模板
   */
  replaceVariables(template: string, variables: Record<string, any>): string {
    if (!template || typeof template !== 'string') {
      return template
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key]
      if (value === undefined || value === null) {
        return match
      }
      // URL 编码字符串值
      if (typeof value === 'string') {
        return encodeURIComponent(value)
      }
      // 对象转为 JSON
      if (typeof value === 'object') {
        try {
          return encodeURIComponent(JSON.stringify(value))
        } catch {
          return match
        }
      }
      return encodeURIComponent(String(value))
    })
  }

  /**
   * 替换 Body 对象中的变量
   */
  replaceVariablesInBody(body: any, variables: Record<string, any>): any {
    if (typeof body === 'string') {
      return this.replaceVariables(body, variables)
    }

    if (typeof body === 'object' && body !== null) {
      return JSON.parse(this.replaceVariables(JSON.stringify(body), variables))
    }

    return body
  }

  /**
   * 清理请求头，移除无效值
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {}
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        sanitized[key] = String(value)
      }
    }
    return sanitized
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any): boolean {
    // 网络错误、超时、5xx 服务器错误应该重试
    if (!error.response) {
      return true // 网络错误
    }

    const status = error.response.status
    return status >= 500 || status === 429 // 服务器错误或限流
  }

  /**
   * 格式化错误信息
   */
  private formatError(error: any): Error {
    if (error.response) {
      // 服务器返回了错误响应
      const { status, statusText, data } = error.response
      return new Error(`HTTP ${status} ${statusText}: ${JSON.stringify(data)}`)
    } else if (error.request) {
      // 请求发出但没有收到响应
      return new Error(`网络错误: ${error.message}`)
    } else {
      // 请求配置出错
      return new Error(`请求错误: ${error.message}`)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
