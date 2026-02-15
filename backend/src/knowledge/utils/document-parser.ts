// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth')
import { marked } from 'marked'

export interface ParsedDocument {
  content: string
  metadata: Record<string, any>
}

// 支持的文件类型
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.markdown', '.pdf', '.docx', '.doc', '.json', '.csv', '.html', '.htm']
const SUPPORTED_MIMETYPES = [
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/json',
]

/**
 * 检查文件是否支持
 */
export function isSupportedFile(filename: string, mimetype: string): boolean {
  const ext = getFileExtension(filename).toLowerCase()
  return SUPPORTED_EXTENSIONS.includes(ext) || SUPPORTED_MIMETYPES.includes(mimetype)
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot >= 0 ? filename.slice(lastDot) : ''
}

/**
 * 解析文档内容
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<ParsedDocument> {
  const ext = getFileExtension(filename).toLowerCase()

  // 根据文件类型选择解析器
  if (ext === '.pdf' || mimetype === 'application/pdf') {
    return parsePDF(buffer)
  }

  if (ext === '.docx' || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return parseDocx(buffer)
  }

  if (ext === '.md' || ext === '.markdown' || mimetype === 'text/markdown') {
    return parseMarkdown(buffer)
  }

  if (ext === '.html' || ext === '.htm' || mimetype === 'text/html') {
    return parseHTML(buffer)
  }

  if (ext === '.json' || mimetype === 'application/json') {
    return parseJSON(buffer)
  }

  if (ext === '.csv' || mimetype === 'text/csv') {
    return parseCSV(buffer)
  }

  // 默认按纯文本处理
  return parseText(buffer)
}

/**
 * 解析纯文本
 */
function parseText(buffer: Buffer): ParsedDocument {
  const content = cleanText(buffer.toString('utf-8'))
  return { content, metadata: { format: 'text' } }
}

/**
 * 解析 Markdown
 */
function parseMarkdown(buffer: Buffer): ParsedDocument {
  const rawContent = buffer.toString('utf-8')
  // 将 Markdown 转换为纯文本（移除格式标记）
  const html = marked(rawContent) as string
  const content = cleanText(stripHtml(html))
  return { content, metadata: { format: 'markdown' } }
}

/**
 * 解析 PDF
 */
async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // pdf-parse 2.x 使用 PDFParse 类，构造函数需要 { data: Buffer }
    const { PDFParse } = pdfParse
    const parser = new PDFParse({ data: buffer })
    await parser.load()
    const text = await parser.getText()

    // 确保 text 是字符串类型
    let textContent = ''
    if (typeof text === 'string') {
      textContent = text
    } else if (Array.isArray(text)) {
      // 如果是数组，合并所有文本
      textContent = text.join('\n')
    } else if (text && typeof text === 'object') {
      // 如果是对象，尝试提取文本内容
      textContent = text.text || text.content || String(text)
    } else {
      textContent = String(text || '')
    }

    let info: any = {}
    try {
      info = await parser.getInfo()
    } catch {
      // getInfo 可能失败，忽略
    }
    const content = cleanText(textContent)
    await parser.destroy()
    return {
      content,
      metadata: {
        format: 'pdf',
        pages: info?.numPages,
        info,
      },
    }
  } catch (error) {
    console.error('[DocumentParser] PDF parsing error:', error)
    throw new Error(`PDF 文件解析失败: ${(error as Error).message}`)
  }
}

/**
 * 解析 Word 文档 (.docx)
 */
async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    const content = cleanText(result.value)
    return {
      content,
      metadata: {
        format: 'docx',
        messages: result.messages,
      },
    }
  } catch (error) {
    console.error('[DocumentParser] DOCX parsing error:', error)
    throw new Error('Word 文档解析失败，请确保文件未损坏')
  }
}

/**
 * 解析 HTML
 */
function parseHTML(buffer: Buffer): ParsedDocument {
  const rawContent = buffer.toString('utf-8')
  const content = cleanText(stripHtml(rawContent))
  return { content, metadata: { format: 'html' } }
}

/**
 * 解析 JSON
 */
function parseJSON(buffer: Buffer): ParsedDocument {
  try {
    const rawContent = buffer.toString('utf-8')
    const data = JSON.parse(rawContent)
    // 将 JSON 转换为可读文本
    const content = cleanText(jsonToText(data))
    return { content, metadata: { format: 'json' } }
  } catch (error) {
    console.error('[DocumentParser] JSON parsing error:', error)
    throw new Error('JSON 文件解析失败，请确保格式正确')
  }
}

/**
 * 解析 CSV
 */
function parseCSV(buffer: Buffer): ParsedDocument {
  const rawContent = buffer.toString('utf-8')
  // 简单处理：将 CSV 转换为可读文本
  const lines = rawContent.split('\n').filter(line => line.trim())
  const content = cleanText(lines.join('\n'))
  return { content, metadata: { format: 'csv', rows: lines.length } }
}

/**
 * 清理文本内容
 */
function cleanText(text: string | any): string {
  // 确保 text 是字符串类型
  if (typeof text !== 'string') {
    if (text === null || text === undefined) {
      return ''
    }
    // 如果是对象或数组，尝试转换为字符串
    text = String(text)
  }

  return text
    .replace(/\0/g, '') // 移除空字节
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 移除控制字符
    .replace(/\r\n/g, '\n') // 统一换行符
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // 合并多余空行
    .trim()
}

/**
 * 移除 HTML 标签
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // 移除 script
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // 移除 style
    .replace(/<[^>]+>/g, ' ') // 移除所有标签
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 将 JSON 对象转换为可读文本
 */
function jsonToText(data: any, indent = 0): string {
  if (data === null || data === undefined) return ''

  if (typeof data === 'string') return data
  if (typeof data === 'number' || typeof data === 'boolean') return String(data)

  if (Array.isArray(data)) {
    return data.map(item => jsonToText(item, indent)).join('\n')
  }

  if (typeof data === 'object') {
    const lines: string[] = []
    for (const [key, value] of Object.entries(data)) {
      const valueText = jsonToText(value, indent + 1)
      if (valueText) {
        lines.push(`${key}: ${valueText}`)
      }
    }
    return lines.join('\n')
  }

  return ''
}

/**
 * 获取支持的文件格式列表
 */
export function getSupportedFormats(): string[] {
  return ['TXT', 'MD', 'PDF', 'DOCX', 'JSON', 'CSV', 'HTML']
}
