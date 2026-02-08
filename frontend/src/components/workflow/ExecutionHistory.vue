<script setup lang="ts">
import type { WorkflowExecution } from '@/types'

// 执行历史面板：展示最近执行记录
const props = defineProps<{ executions: WorkflowExecution[]; filterStatus: string }>()

const emit = defineEmits<{
  (e: 'select', execution: WorkflowExecution): void
  (e: 'filter-change', value: string): void
  (e: 'export', format: 'json' | 'txt' | 'md'): void
}>()
</script>

<template>
  <div class="history">
    <div class="title">执行历史</div>
    <div class="toolbar">
      <el-select
        size="small"
        :model-value="props.filterStatus"
        placeholder="状态筛选"
        @update:model-value="emit('filter-change', $event)"
      >
        <el-option label="全部" value="" />
        <el-option label="完成" value="completed" />
        <el-option label="失败" value="failed" />
        <el-option label="运行中" value="running" />
      </el-select>
      <el-button size="small" @click="emit('export', 'md')">导出MD</el-button>
      <el-button size="small" @click="emit('export', 'json')">导出JSON</el-button>
      <el-button size="small" @click="emit('export', 'txt')">导出TXT</el-button>
    </div>
    <div v-if="props.executions.length === 0" class="empty">暂无记录</div>
    <div v-else class="list">
      <div
        v-for="item in props.executions"
        :key="item.id"
        class="row"
        @click="emit('select', item)"
      >
        <div class="meta">
          <span class="status" :class="item.status">{{ item.status }}</span>
          <span class="time">{{ item.startedAt }}</span>
        </div>
        <div v-if="item.errorMessage" class="error">{{ item.errorMessage }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history {
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

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.empty {
  color: #94a3b8;
  font-size: 12px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #475569;
}

.status {
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 600;
  text-transform: uppercase;
}

.status.completed {
  background: #dcfce7;
  color: #166534;
}

.status.failed {
  background: #fee2e2;
  color: #991b1b;
}

.status.running,
.status.pending {
  background: #e0f2fe;
  color: #075985;
}

.error {
  margin-top: 6px;
  font-size: 12px;
  color: #b91c1c;
}
</style>
