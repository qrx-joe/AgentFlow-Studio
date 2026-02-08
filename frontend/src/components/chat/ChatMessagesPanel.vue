<script setup lang="ts">
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

const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const renderContent = (msg: Message) => {
  const raw = String(msg.content || '')
  let html = escapeHtml(raw)

  const snippets = (msg.sources || [])
    .map(item => String(item.content || '').trim())
    .filter(Boolean)

  for (let i = 0; i < snippets.length; i += 1) {
    const snippet = snippets[i]
    const safeSnippet = escapeHtml(snippet)
    if (safeSnippet && html.includes(safeSnippet)) {
      html = html.split(safeSnippet).join(
        `<mark class="highlight" data-source-index="${i}">${safeSnippet}</mark>`
      )
    }
  }

  return html.replace(/\n/g, '<br />')
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
</script>

<template>
  <section class="chat">
    <div class="messages">
      <div
        v-for="msg in props.messages"
        :key="msg.id"
        :id="`msg-${msg.id}`"
        class="message"
        :class="msg.role"
      >
        <div class="role">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
        <div class="bubble" :class="{ highlight: msg.id === props.activeMessageId }">
          <div
            v-if="msg.role === 'assistant'"
            class="content"
            v-html="renderContent(msg)"
            @click="handleContentClick(msg, $event)"
          />
          <div v-else class="content">{{ msg.content }}</div>
          <div v-if="msg.sources?.length" class="sources">
            <div
              v-for="(src, index) in msg.sources"
              :key="index"
              class="source-chip"
              @click="emit('selectSource', msg.id, src)"
            >
              📎 {{ src.documentId || src.nodeId || '来源' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="input">
      <el-input
        :model-value="props.input"
        type="textarea"
        :rows="2"
        placeholder="输入消息..."
        @update:model-value="value => emit('update:input', value)"
      />
      <el-button type="primary" :loading="props.loading" @click="emit('send')">发送</el-button>
      <el-button v-if="props.streaming" type="danger" @click="emit('stop')">停止</el-button>
    </div>

    <div v-if="props.streaming" class="streaming-hint">正在生成回答...</div>
  </section>
</template>

<style scoped>
.chat {
  background: #ffffff;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow: auto;
  padding-right: 6px;
}

.message {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.bubble {
  background: #f1f5f9;
  border-radius: 10px;
  padding: 10px 12px;
  max-width: 70%;
}

.bubble.highlight {
  border: 1px solid #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.message.user .bubble {
  background: #e0f2fe;
}

.role {
  font-size: 16px;
}

.content {
  font-size: 13px;
  color: #0f172a;
}

.highlight {
  background: #fef9c3;
  color: #854d0e;
  padding: 0 2px;
  border-radius: 4px;
  cursor: pointer;
}

.sources {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.source-chip {
  padding: 2px 6px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  font-size: 12px;
  color: #0ea5e9;
}

.input {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.streaming-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}
</style>
