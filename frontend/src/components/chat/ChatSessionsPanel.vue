<script setup lang="ts">
import type { Session } from '@/types'

const props = defineProps<{
  sessions: Session[]
  currentSessionId: string
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'create'): void
}>()
</script>

<template>
  <aside class="sessions">
    <div class="title">会话列表</div>
    <el-button size="small" type="primary" @click="emit('create')">新建会话</el-button>
    <div class="session-list">
      <div
        v-for="session in props.sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: session.id === props.currentSessionId }"
        @click="emit('select', session.id)"
      >
        {{ session.title || '新会话' }}
      </div>
    </div>
  </aside>
</template>

<style scoped>
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

.title {
  font-weight: 600;
}
</style>
