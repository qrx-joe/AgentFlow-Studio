<script setup lang="ts">
import type { Session } from '@/types'

const props = defineProps<{
  sessions: Session[]
  currentSessionId: string
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'create'): void
  (e: 'delete', id: string): void
}>()

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}小时前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const handleDelete = (e: Event, id: string) => {
  e.stopPropagation()
  emit('delete', id)
}
</script>

<template>
  <aside class="sessions-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="logo-icon">💬</div>
        <span class="logo-text">对话历史</span>
      </div>
      <button class="btn-new-chat" @click="emit('create')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        新对话
      </button>
    </div>

    <div class="session-list">
      <div
        v-for="session in props.sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: session.id === props.currentSessionId }"
        @click="emit('select', session.id)"
      >
        <div class="session-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div class="session-info">
          <div class="session-title">{{ session.title || '新对话' }}</div>
          <div class="session-time">{{ formatTime(session.updatedAt || session.createdAt || '') }}</div>
        </div>
        <button class="btn-delete" @click="handleDelete($event, session.id)" title="删除">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="sessions.length === 0" class="empty-sessions">
      <div class="empty-icon">🗨️</div>
      <div class="empty-text">还没有对话</div>
      <div class="empty-hint">点击「新对话」开始</div>
    </div>
  </aside>
</template>

<style scoped>
.sessions-sidebar {
  background: #ffffff; 
  /* Dify style light background */
  border: 1px solid #e2e8f0; /* Full border */
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); /* Subtle shadow */
}

.sidebar-header {
  padding: 20px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  /* border-bottom: 1px solid #f3f4f6; */
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 4px;
}

.logo-icon {
  font-size: 20px;
  /* Dify logic: colorful icon */
  filter: grayscale(0.2);
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #111827; /* Dark text for light mode */
  letter-spacing: 0.5px;
}

.btn-new-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-primary-900);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-new-chat:hover {
  background: var(--color-primary-800);
  transform: translateY(-1px);
}

.btn-new-chat:active {
  transform: translateY(0);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px; /* Slightly more gap */
}

.session-list::-webkit-scrollbar {
  width: 4px;
}

.session-list::-webkit-scrollbar-track {
  background: transparent;
}

.session-list::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 4px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  color: #4b5563;
}

.session-item:hover {
  background: #f3f4f6;
  color: #111827;
}

.session-item.active {
  background: #f1f5f9;
  color: #0f172a;
}

.session-icon {
  color: #9ca3af;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.session-item.active .session-icon {
  color: #0f172a;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 14px; /* Slightly larger */
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}

.session-item.active .session-time {
  color: #94a3b8;
}

.btn-delete {
  opacity: 0;
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.15s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.session-item:hover .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  color: #ef4444;
  background: #fee2e2;
}

.empty-sessions {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 32px;
  opacity: 0.3;
  filter: grayscale(1);
}

.empty-text {
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.empty-hint {
  color: #9ca3af;
  font-size: 12px;
}
</style>
