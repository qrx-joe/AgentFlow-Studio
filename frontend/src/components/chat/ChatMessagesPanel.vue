<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { Message } from '@/types'

const props = defineProps<{
  messages: Message[]
  activeMessageId: string
  input: string
  loading: boolean
  streaming: boolean
}>()

const emit = defineEmits<{
  (e: 'update:input', value: string): void
  (e: 'send'): void
  (e: 'stop'): void
  (e: 'selectSource', messageId: string, source: any): void
}>()

const messagesContainer = ref<HTMLDivElement>()
const textareaRef = ref<HTMLTextAreaElement>()

// 自动滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(() => props.messages.length, scrollToBottom)
watch(() => props.messages[props.messages.length - 1]?.content, scrollToBottom)

// Enter 发送, Shift+Enter 换行
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('send')
  }
}

// 自动调整 textarea 高度
const autoResize = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 200) + 'px'
  }
}

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  emit('update:input', target.value)
  autoResize()
}

const formatTime = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 简易 Markdown 渲染
const renderMarkdown = (text: string) => {
  if (!text) return ''
  let html = text
    // 转义 HTML (基本)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 代码块
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, lang, code) => {
    return `<pre class="code-block"><code class="language-${lang}">${code.trim()}</code></pre>`
  })
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
  // 加粗
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // 斜体
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // 标题
  html = html.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>')
  html = html.replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>')
  // 无序列表
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="md-list">$1</ul>')
  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
  // 换行 (保留段落感)
  html = html.replace(/\n\n/g, '<div class="spacer"></div>')
  html = html.replace(/\n/g, '<br />')
  
  // 清理
  html = html.replace(/<br \/><\/li>/g, '</li>')
  html = html.replace(/<br \/><pre/g, '<pre')
  html = html.replace(/<\/pre><br \/>/g, '</pre>')

  return html
}

const renderContent = (msg: Message) => {
  const raw = String(msg.content || '')
  let html = renderMarkdown(raw)

  // 高亮来源文本
  const snippets = (msg.sources || [])
    .map(item => String(item.content || '').trim())
    .filter(Boolean)

  for (let i = 0; i < snippets.length; i += 1) {
    const snippet = snippets[i]
    if (snippet.length < 5) continue // 忽略太短的
    const safeSnippet = snippet
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    if (html.includes(safeSnippet)) {
      html = html.split(safeSnippet).join(
        `<mark class="source-highlight" data-source-index="${i}">${safeSnippet}</mark>`
      )
    }
  }

  return html
}

const handleContentClick = (msg: Message, event: MouseEvent) => {
  const target = event.target as HTMLElement
  const mark = target.closest('mark') as HTMLElement | null
  if (!mark) return
  const index = Number(mark.dataset.sourceIndex)
  if (Number.isNaN(index)) return
  const source = msg.sources?.[index]
  if (source) {
    emit('selectSource', msg.id, source)
  }
}

// 示例问题
const quickPrompts = [
  { icon: '💡', text: '解释一下 RAG 检索增强生成的原理' },
  { icon: '📝', text: '帮我写一段 TypeScript 工具函数' },
  { icon: '🔍', text: '在我的知识库中搜索相关资料' },
]

const handleQuickPrompt = (text: string) => {
  emit('update:input', text)
  nextTick(() => emit('send'))
}
</script>

<template>
  <section class="chat-main">
    <!-- 1. 消息列表区 -->
    <div ref="messagesContainer" class="messages-scroll-area">
      <!-- 空状态 -->
      <div v-if="props.messages.length === 0" class="welcome-container">
        <div class="welcome-content">
          <div class="welcome-logo">
            <div class="logo-icon-large">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"></path>
                <path d="M9 12h.01"></path>
                <path d="M15 12h.01"></path>
              </svg>
            </div>
            <!-- <div class="logo-ring"></div> -->
          </div>
          <h2 class="welcome-title">有什么可以帮你的吗？</h2>
          <p class="welcome-desc">AgentFlow AI 助手，基于你的知识库进行智能对话</p>
          <div class="quick-prompts">
            <button
              v-for="(prompt, index) in quickPrompts"
              :key="prompt.text"
              class="quick-prompt"
              @click="handleQuickPrompt(prompt.text)"
            >
              <div class="qp-icon">
                <svg v-if="index === 0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"></path><path d="M9 21h6"></path></svg>
                <svg v-else-if="index === 1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <div class="qp-text">{{ prompt.text }}</div>
              <div class="qp-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- 消息流 -->
      <div v-else class="chat-flow">
        <div
          v-for="msg in props.messages"
          :key="msg.id"
          :id="`msg-${msg.id}`"
          class="message-row"
          :class="[msg.role]"
        >
          <!-- 头像 -->
          <div class="avatar" :class="msg.role">
            <svg v-if="msg.role === 'user'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"></path>
            </svg>
          </div>

          <!-- 消息内容 -->
          <div class="message-content-wrapper">
            <div class="message-sender">
              {{ msg.role === 'user' ? '你' : 'AI 助手' }}
              <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
            </div>

            <div class="message-bubble" :class="msg.role">
              <!-- AI 消息（无气泡背景） -->
              <div
                v-if="msg.role === 'assistant'"
                class="markdown-body"
                v-html="renderContent(msg)"
                @click="handleContentClick(msg, $event)"
              />
              <!-- 用户消息（有气泡背景） -->
              <div v-else class="user-text">{{ msg.content }}</div>

              <!-- 打字光标 -->
              <span
                v-if="msg.role === 'assistant' && props.streaming && msg === props.messages[props.messages.length - 1]"
                class="typing-cursor"
              >●</span>
            </div>

            <!-- 来源 (仅 AI) -->
            <div v-if="msg.role === 'assistant' && msg.sources?.length" class="sources-area">
              <div class="sources-title">引用来源</div>
              <div class="source-list">
                <div
                  v-for="(src, index) in msg.sources"
                  :key="index"
                  class="source-item"
                  @click="emit('selectSource', msg.id, src)"
                >
                  <span class="source-idx">{{ index + 1 }}</span>
                  <span class="source-name">{{ src.documentId?.slice(0, 8) || '未知文档' }}</span>
                </div>
              </div>
            </div>
            
            <!-- 底部操作栏 (仅 AI) -->
            <div v-if="msg.role === 'assistant' && !props.streaming" class="message-actions">
              <button class="action-btn" title="复制">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                   <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <button class="action-btn" title="重新生成">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 流式加载中指示 -->
        <div v-if="props.streaming" class="streaming-status">
           <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
           </svg>
           AI 思考中...
        </div>
        
        <!-- 底部垫高，防止被输入框遮挡 -->
        <div style="height: 120px;"></div>
      </div>
    </div>

    <!-- 2. 输入区（悬浮卡片） -->
    <div class="input-float-container">
      <div class="input-card">
        <textarea
          ref="textareaRef"
          :value="props.input"
          placeholder="问点什么... (Enter 发送)"
          rows="1"
          @input="handleInput"
          @keydown="handleKeydown"
        />
        <div class="input-actions-row">
          <div class="start-actions">
            <button class="tool-btn" title="上传附件">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </button>
          </div>
          <div class="end-actions">
            <button
              v-if="props.streaming"
              class="send-btn stop"
              @click="emit('stop')"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
             <button
              v-else
              class="send-btn"
              :class="{ active: props.input?.trim() }"
              :disabled="!props.input?.trim() || props.loading"
              @click="emit('send')"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div class="footer-hint">AgentFlow AI 提供技术支持</div>
    </div>
  </section>
</template>

<style scoped>
.chat-main {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff; /* Clean white bg */
  overflow: hidden;
  border: 1px solid #e2e8f0; /* Full border */
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); /* Subtle shadow */
}

/* ===== 1. 消息滚动区 ===== */
.messages-scroll-area {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 0;
}

/* 隐藏滚动条但保留功能 (Chrome/Safari) */
.messages-scroll-area::-webkit-scrollbar {
  width: 6px;
}
.messages-scroll-area::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 3px;
}
.messages-scroll-area::-webkit-scrollbar-track {
  background: transparent;
}


/* 欢迎页 */
.welcome-container {
  max-width: 640px;
  margin: 0 auto;
  min-height: 80%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-content {
  text-align: center;
  width: 100%;
}

.welcome-logo {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.logo-icon-large {
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.5px;
  margin-bottom: 12px;
}

.welcome-desc {
  font-size: 15px;
  color: #64748b;
  margin-bottom: 40px;
}

.quick-prompts {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.quick-prompt {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
  text-align: left;
}

.quick-prompt:hover {
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.qp-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 10px;
  color: #475569;
}

.quick-prompt:hover .qp-icon {
  background: #f1f5f9;
  color: #0f172a;
}

.qp-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.quick-prompt:hover .qp-text {
  color: #0f172a;
}

.qp-arrow {
  color: #cbd5e1;
  opacity: 0;
  transform: translateX(-5px);
  transition: all 0.2s;
}

.quick-prompt:hover .qp-arrow {
  opacity: 1;
  transform: translateX(0);
  color: #94a3b8;
}

/* 对话流容器 - 取 Dify 的居中窄布局 */
.chat-flow {
  max-width: 800px; /* 关键：限制宽度 */
  margin: 0 auto;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  gap: 32px; /* 消息间距大一点 */
}

/* 消息行 */
.message-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.message-row.user {
  flex-direction: row-reverse;
}

/* 头像 */
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px; /* Slightly squarer than typical circle */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  border: 1px solid transparent;
}

.avatar.user {
  background: #eff6ff; /* Solid light blue */
  color: #2563eb;
  border-color: #dbeafe;
}

.avatar.assistant {
  background: #ffffff;
  color: #0f172a;
  border-color: #e2e8f0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05); /* Subtle shadow for white avatar */
}

/* 消息体 Wrapper */
.message-content-wrapper {
  flex: 1;
  min-width: 0;
  max-width: 90%; /* 给头像留点空间 */
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.message-row.user .message-content-wrapper {
  align-items: flex-end;
}

.message-sender {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
  font-weight: 500;
}

.msg-time {
  opacity: 0.5;
  margin-left: 6px;
  font-weight: 400;
}

/* 消息内容 (气泡/文本) */
.message-bubble {
  font-size: 15px;
  line-height: 1.7;
  word-break: break-word;
}

/* AI 消息：去气泡化，直接显示 markdown */
.message-row.assistant .message-bubble {
  width: 100%;
  color: #1e293b;
}

/* 用户消息：纯蓝气泡，无渐变 */
.message-row.user .message-bubble {
  background: #2563eb; /* Pure Blue */
  color: #ffffff;
  padding: 12px 16px;
  border-radius: 12px 2px 12px 12px;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.1);
}

.user-text {
  font-family: inherit;
}

/* 来源 */
.sources-area {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e2e8f0;
  width: 100%;
}

.sources-title {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.source-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.source-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.source-item:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.source-idx {
  background: #f1f5f9;
  color: #64748b;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.source-name {
  font-size: 12px;
  color: #475569;
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-row:hover .message-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.action-btn:hover {
  background: #f1f5f9;
  color: #475569;
}

/* Markdown 样式覆盖 (Light) */
.markdown-body :deep(h2) { font-size: 1.1em; font-weight: 700; margin-top: 16px; color: #0f172a; }
.markdown-body :deep(p) { margin: 8px 0; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 20px; }
.markdown-body :deep(.code-block) {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #334155;
  margin: 12px 0;
}
.markdown-body :deep(.inline-code) {
  background: #f1f5f9;
  color: #0f172a;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
}
.markdown-body :deep(.source-highlight) {
  background: rgba(253, 224, 71, 0.4);
  border-bottom: 2px solid #eab308;
}

/* 流式加载 */
.streaming-status {
  padding-left: 50px; /* Align with text */
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
}

.animate-spin {
  animation: spin 2s linear infinite;
}
@keyframes spin { 100% { transform: rotate(360deg); } }

/* ===== 2. 悬浮输入区 ===== */
.input-float-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0 20px 24px;
  /* background: linear-gradient(to top, #ffffff 80%, rgba(255,255,255,0)); */
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.5); /* Subtle top border */
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.input-card {
  width: 100%;
  max-width: 800px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); /* Strong shadow */
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s;
}

.input-card:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.12);
}

.input-card textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font-size: 15px;
  line-height: 1.5;
  color: #111827;
  background: transparent;
  max-height: 200px;
  font-family: inherit;
}

.input-card textarea::placeholder {
  color: #9ca3af;
}

.input-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.start-actions {
  display: flex;
  gap: 8px;
}

.tool-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: none;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.tool-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.send-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
  transition: all 0.2s;
}

.send-btn.active {
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}

.send-btn.stop {
  background: #fee2e2;
  color: #ef4444;
  cursor: pointer;
}

.footer-hint {
  font-size: 11px;
  color: #d1d5db;
  margin-top: 8px;
}
</style>
