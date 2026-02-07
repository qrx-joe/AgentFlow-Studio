<script setup lang="ts">
import { computed } from 'vue'

// 执行日志面板：按节点分组展示
const props = defineProps<{ logs: string[] }>()

const emit = defineEmits<{
  (e: 'select-node', nodeId: string): void
}>()

const groupedLogs = computed(() => {
  const groups: Array<{ title: string; items: string[]; nodeId?: string }> = []
  let currentGroup: { title: string; items: string[]; nodeId?: string } | null = null

  for (const line of props.logs) {
    // 识别节点执行起始日志
    if (line.includes('执行节点：')) {
      const match = line.match(/\(([^)]+)\)/)
      const nodeId = match ? match[1] : undefined
      if (currentGroup) {
        groups.push(currentGroup)
      }
      currentGroup = { title: line, items: [], nodeId }
      continue
    }

    if (!currentGroup) {
      currentGroup = { title: '通用日志', items: [] }
    }
    currentGroup.items.push(line)
  }

  if (currentGroup) {
    groups.push(currentGroup)
  }

  return groups
})
</script>

<template>
  <div class="log">
    <div class="title">执行日志</div>
    <div v-if="props.logs.length === 0" class="empty">暂无日志</div>
    <div v-else class="list">
      <div v-for="(group, gIndex) in groupedLogs" :key="gIndex" class="group">
        <div
          class="group-title"
          :class="{ clickable: group.nodeId }"
          @click="group.nodeId && emit('select-node', group.nodeId)"
        >
          {{ group.title }}
        </div>
        <div v-if="group.items.length === 0" class="item muted">无额外信息</div>
        <div v-for="(item, index) in group.items" :key="index" class="item">
          {{ item }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.log {
  background: #ffffff;
  border-radius: 12px;
  padding: 12px;
  height: 220px;
  overflow: auto;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 10px;
}

.empty {
  color: #94a3b8;
  font-size: 12px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px;
}

.group-title {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 6px;
}

.group-title.clickable {
  cursor: pointer;
  color: #0ea5e9;
}

.item {
  font-size: 12px;
  color: #334155;
}

.item.muted {
  color: #94a3b8;
}
</style>
