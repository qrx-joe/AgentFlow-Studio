<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const input = ref('')
const showSourceDrawer = ref(false)
const selectedSource = ref<any>(null)
const activeMessageId = ref('')

onMounted(() => {
  chatStore.fetchSessions()
})

const handleSend = async () => {
  if (!input.value.trim()) return
  const content = input.value
  input.value = ''
  await chatStore.sendMessage(content)
}

const handleStop = () => {
  chatStore.abortStreaming()
}

const handleSelectSource = (messageId: string, source: any) => {
  // 记录当前高亮的消息与来源
  activeMessageId.value = messageId
  selectedSource.value = source
  showSourceDrawer.value = true

  // 自动滚动到对应消息，便于定位
  nextTick(() => {
    const target = document.getElementById(`msg-${messageId}`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const renderContent = (msg: any) => {
  const raw = String(msg.content || '')
  let html = escapeHtml(raw)

  const snippets = (msg.sources || [])
    .map((item: any) => String(item.content || '').trim())
    .filter(Boolean)
    .map(snippet => snippet.length > 80 ? snippet.slice(0, 80) : snippet)

  for (const snippet of snippets) {
    const safeSnippet = escapeHtml(snippet)
    if (safeSnippet && html.includes(safeSnippet)) {
      html = html.replace(safeSnippet, `<mark class="highlight">${safeSnippet}</mark>`)
    }
  }

  return html.replace(/\n/g, '<br />')
}
</script>

<template>
  <div class="page">
    <aside class="sessions">
      <div class="title">会话列表</div>
      <el-button size="small" type="primary" @click="chatStore.createSession()">新建会话</el-button>
      <div class="session-list">
        <div
          v-for="session in chatStore.sessions"
          :key="session.id"
          class="session-item"
          :class="{ active: session.id === chatStore.currentSessionId }"
          @click="chatStore.selectSession(session.id)"
        >
          {{ session.title || '新会话' }}
        </div>
      </div>
    </aside>

    <section class="chat">
      <div class="messages">
        <div
          v-for="msg in chatStore.messages"
          :key="msg.id"
          :id="`msg-${msg.id}`"
          class="message"
          :class="msg.role"
        >
          <div class="role">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
          <div class="bubble" :class="{ highlight: msg.id === activeMessageId }">
            <div
              v-if="msg.role === 'assistant'"
              class="content"
              v-html="renderContent(msg)"
            />
            <div v-else class="content">{{ msg.content }}</div>
            <div v-if="msg.sources?.length" class="sources">
              <div
                v-for="(src, index) in msg.sources"
                :key="index"
                class="source-chip"
                @click="handleSelectSource(msg.id, src)"
              >
                📎 {{ src.documentId || src.nodeId || '来源' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="input">
        <el-input v-model="input" type="textarea" :rows="2" placeholder="输入消息..." />
        <el-button type="primary" :loading="chatStore.loading" @click="handleSend">发送</el-button>
        <el-button v-if="chatStore.streaming" type="danger" @click="handleStop">停止</el-button>
      </div>

      <div v-if="chatStore.streaming" class="streaming-hint">
        正在生成回答...
      </div>
    </section>

    <el-drawer v-model="showSourceDrawer" title="来源详情" size="360px">
      <div v-if="selectedSource" class="source-detail">
        <div class="detail-item">
          <div class="label">文档ID</div>
          <div class="value">{{ selectedSource.documentId || '-' }}</div>
        </div>
        <div class="detail-item">
          <div class="label">节点ID</div>
          <div class="value">{{ selectedSource.nodeId || '-' }}</div>
        </div>
        <div class="detail-item" v-if="selectedSource.content">
          <div class="label">内容片段</div>
          <pre class="snippet">{{ selectedSource.content }}</pre>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  height: 100%;
}

.sessions {
  background: #ffffff;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-item {
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  font-size: 13px;
}

.session-item.active {
  background: #e0f2fe;
  border: 1px solid #7dd3fc;
}

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

.title {
  font-weight: 600;
}

.source-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  gap: 10px;
}

.label {
  width: 70px;
  font-weight: 600;
  color: #334155;
}

.value {
  color: #0f172a;
}

.snippet {
  background: #0f172a;
  color: #e2e8f0;
  padding: 8px;
  border-radius: 8px;
  width: 100%;
  overflow: auto;
}
</style>
