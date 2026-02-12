<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'
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
    textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 150) + 'px'
  }
}

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  emit('update:input', target.value)
  autoResize()
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 简易 Markdown 渲染
const renderMarkdown = (text: string) => {
  if (!text) return ''
  let html = text
    // 转义 HTML
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
  // 换行
  html = html.replace(/\n/g, '<br />')
  // 清理多余 br
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
    const safeSnippet = snippet
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    if (safeSnippet && html.includes(safeSnippet)) {
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
    <!-- 空状态欢迎页 -->
    <div v-if="props.messages.length === 0" class="welcome">
      <div class="welcome-icon">
        <div class="glow-ring"></div>
        <span class="ai-logo">🤖</span>
      </div>
      <h2 class="welcome-title">你好，有什么我能帮到你的？</h2>
      <p class="welcome-desc">AgentFlow AI 助手，基于你的知识库进行智能对话</p>
      <div class="quick-prompts">
        <button
          v-for="prompt in quickPrompts"
          :key="prompt.text"
          class="quick-prompt"
          @click="handleQuickPrompt(prompt.text)"
        >
          <span class="qp-icon">{{ prompt.icon }}</span>
          <span class="qp-text">{{ prompt.text }}</span>
        </button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div v-else ref="messagesContainer" class="messages-container">
      <div
        v-for="msg in props.messages"
        :key="msg.id"
        :id="`msg-${msg.id}`"
        class="message-row"
        :class="[msg.role, { highlighted: msg.id === props.activeMessageId }]"
      >
        <div class="avatar" :class="msg.role">
          <span v-if="msg.role === 'user'">👤</span>
          <span v-else>🤖</span>
        </div>

        <div class="message-body">
          <div class="message-meta">
            <span class="role-label">{{ msg.role === 'user' ? '你' : 'AI 助手' }}</span>
            <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
          </div>

          <div class="bubble" :class="msg.role">
            <div
              v-if="msg.role === 'assistant'"
              class="content markdown-body"
              v-html="renderContent(msg)"
              @click="handleContentClick(msg, $event)"
            />
            <div v-else class="content">{{ msg.content }}</div>

            <!-- 打字光标 -->
            <span
              v-if="msg.role === 'assistant' && props.streaming && msg === props.messages[props.messages.length - 1]"
              class="typing-cursor"
            >▎</span>
          </div>

          <!-- 来源标签 -->
          <div v-if="msg.sources?.length" class="sources">
            <div class="sources-label">📚 引用来源</div>
            <div class="source-chips">
              <button
                v-for="(src, index) in msg.sources"
                :key="index"
                class="source-chip"
                @click="emit('selectSource', msg.id, src)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                {{ src.documentId?.slice(0, 8) || '来源' }} #{{ index + 1 }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 生成中提示 -->
      <div v-if="props.streaming" class="streaming-indicator">
        <div class="dot-pulse">
          <span></span><span></span><span></span>
        </div>
        <span class="streaming-text">正在生成回答...</span>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="input-area">
      <div class="input-card">
        <textarea
          ref="textareaRef"
          :value="props.input"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
          rows="1"
          @input="handleInput"
          @keydown="handleKeydown"
        />
        <div class="input-actions">
          <button
            v-if="props.streaming"
            class="btn-stop"
            @click="emit('stop')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            停止
          </button>
          <button
            v-else
            class="btn-send"
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
      <div class="input-hint">AgentFlow AI · 基于知识库的智能助手</div>
    </div>
  </section>
</template>

<style scoped>
.chat-main {
  background: #ffffff;
  border-radius: 16px;
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.04),
    0 8px 24px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ===== 欢迎页 ===== */
.welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
}

.welcome-icon {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.glow-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.15) 0%,
    rgba(59, 130, 246, 0.05) 60%,
    transparent 70%
  );
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.2); opacity: 1; }
}

.ai-logo {
  font-size: 36px;
  z-index: 1;
}

.welcome-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.welcome-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.quick-prompts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 24px;
  width: 100%;
  max-width: 420px;
}

.quick-prompt {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.quick-prompt:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.qp-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.qp-text {
  font-size: 13px;
  color: #334155;
  font-weight: 500;
}

/* ===== 消息区 ===== */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 3px;
}

.message-row {
  display: flex;
  gap: 12px;
  animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-row.highlighted .bubble {
  outline: 2px solid #38bdf8;
  outline-offset: 2px;
}

/* 头像 */
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.avatar.user {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
}

.avatar.assistant {
  background: linear-gradient(135deg, #10b981, #06b6d4);
}

/* 消息体 */
.message-body {
  flex: 1;
  min-width: 0;
  max-width: 80%;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.role-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.msg-time {
  font-size: 11px;
  color: #94a3b8;
}

/* 气泡 */
.bubble {
  padding: 14px 18px;
  border-radius: 4px 16px 16px 16px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.bubble.user {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #fff;
  border-radius: 16px 4px 16px 16px;
}

.bubble.assistant {
  background: #f1f5f9;
  color: #1e293b;
  border: 1px solid #e2e8f0;
}

/* 打字光标 */
.typing-cursor {
  display: inline-block;
  color: #3b82f6;
  font-weight: 700;
  animation: blink 0.8s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Markdown 样式 */
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 12px 0 6px;
  color: #0f172a;
}

.markdown-body :deep(.md-h2) { font-size: 17px; }
.markdown-body :deep(.md-h3) { font-size: 15px; }
.markdown-body :deep(.md-h4) { font-size: 14px; }

.markdown-body :deep(.code-block) {
  background: #0f172a;
  color: #e2e8f0;
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  margin: 8px 0;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.markdown-body :deep(.inline-code) {
  background: #e0e7ff;
  color: #4338ca;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.markdown-body :deep(.md-list) {
  padding-left: 20px;
  margin: 4px 0;
}

.markdown-body :deep(strong) {
  color: #0f172a;
  font-weight: 600;
}

.markdown-body :deep(.source-highlight) {
  background: #fef9c3;
  color: #854d0e;
  padding: 0 3px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.15s;
}

.markdown-body :deep(.source-highlight:hover) {
  background: #fde047;
}

/* 来源标签 */
.sources {
  margin-top: 10px;
}

.sources-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 6px;
}

.source-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.source-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 8px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  cursor: pointer;
  font-size: 12px;
  color: #0369a1;
  font-weight: 500;
  transition: all 0.15s;
}

.source-chip:hover {
  background: #e0f2fe;
  border-color: #7dd3fc;
}

/* 流式指示器 */
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
}

.dot-pulse {
  display: flex;
  gap: 4px;
}

.dot-pulse span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
  animation: dotBounce 1.4s ease-in-out infinite;
}

.dot-pulse span:nth-child(2) { animation-delay: 0.2s; }
.dot-pulse span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.streaming-text {
  font-size: 12px;
  color: #94a3b8;
}

/* ===== 输入区 ===== */
.input-area {
  padding: 16px 20px 12px;
  border-top: 1px solid #f1f5f9;
}

.input-card {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px 14px;
  transition: all 0.2s;
}

.input-card:focus-within {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: #fff;
}

.input-card textarea {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  color: #0f172a;
  font-family: inherit;
  max-height: 150px;
}

.input-card textarea::placeholder {
  color: #94a3b8;
}

.input-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.btn-send {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: none;
  background: #e2e8f0;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-send.active {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #fff;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.btn-send:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-stop {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  background: #fef2f2;
  color: #dc2626;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-stop:hover {
  background: #fee2e2;
}

.input-hint {
  text-align: center;
  font-size: 11px;
  color: #cbd5e1;
  margin-top: 8px;
}
</style>
