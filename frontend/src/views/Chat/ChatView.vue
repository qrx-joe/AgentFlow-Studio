<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import ChatSessionsPanel from '@/components/chat/ChatSessionsPanel.vue'
import ChatMessagesPanel from '@/components/chat/ChatMessagesPanel.vue'
import ChatSourceDrawer from '@/components/chat/ChatSourceDrawer.vue'

const chatStore = useChatStore()
const input = ref('')
const showSourceDrawer = ref(false)
const selectedSource = ref<any>(null)
const activeMessageId = ref('')
const router = useRouter()
const focusKey = 'knowledgeDocFocus'
const sidebarCollapsed = ref(false)

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

const handleDeleteSession = async (id: string) => {
  await chatStore.deleteSession(id)
}

const handleSelectSource = (messageId: string, source: any) => {
  activeMessageId.value = messageId
  selectedSource.value = source
  showSourceDrawer.value = true

  nextTick(() => {
    const target = document.getElementById(`msg-${messageId}`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

const goToDocument = () => {
  if (!selectedSource.value?.documentId) {
    return
  }
  localStorage.setItem(
    focusKey,
    JSON.stringify({
      docId: selectedSource.value.documentId,
      snippet: selectedSource.value.content || '',
    })
  )
  router.push('/knowledge')
}

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <div
    class="chat-page"
    :class="{ 'sidebar-collapsed': sidebarCollapsed }"
  >
    <ChatSessionsPanel
      :sessions="chatStore.sessions"
      :current-session-id="chatStore.currentSessionId"
      :collapsed="sidebarCollapsed"
      @select="chatStore.selectSession"
      @create="chatStore.createSession"
      @delete="handleDeleteSession"
      @toggle-collapse="toggleSidebar"
    />

    <ChatMessagesPanel
      v-model:input="input"
      :messages="chatStore.messages"
      :active-message-id="activeMessageId"
      :loading="chatStore.loading"
      :streaming="chatStore.streaming"
      @send="handleSend"
      @stop="handleStop"
      @select-source="handleSelectSource"
    />

    <ChatSourceDrawer
      v-model="showSourceDrawer"
      :selected-source="selectedSource"
      @open-doc="goToDocument"
    />
  </div>
</template>

<style scoped>
.chat-page {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  height: 100%;
  padding: 24px 32px;
  box-sizing: border-box;
  transition: grid-template-columns 0.3s ease;
}

.chat-page.sidebar-collapsed {
  grid-template-columns: 60px 1fr;
}

@media (max-width: 768px) {
  .chat-page {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .chat-page.sidebar-collapsed {
    grid-template-columns: 1fr;
  }
}
</style>
