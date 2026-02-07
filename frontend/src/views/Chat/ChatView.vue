<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const input = ref('')

onMounted(() => {
  chatStore.fetchSessions()
})

const handleSend = async () => {
  if (!input.value.trim()) return
  const content = input.value
  input.value = ''
  await chatStore.sendMessage(content)
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
        <div v-for="msg in chatStore.messages" :key="msg.id" class="message" :class="msg.role">
          <div class="role">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
          <div class="bubble">
            <div class="content">{{ msg.content }}</div>
            <div v-if="msg.sources?.length" class="sources">
              <div v-for="(src, index) in msg.sources" :key="index">📎 {{ src.documentId || src.nodeId }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="input">
        <el-input v-model="input" type="textarea" :rows="2" placeholder="输入消息..." />
        <el-button type="primary" :loading="chatStore.loading" @click="handleSend">发送</el-button>
      </div>
    </section>
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

.sources {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.input {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.title {
  font-weight: 600;
}
</style>
