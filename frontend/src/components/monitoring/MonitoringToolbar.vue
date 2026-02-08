<script setup lang="ts">
const props = defineProps<{
  days: number
  failureThreshold: number
  cacheHitThreshold: number
}>()

const emit = defineEmits<{
  (e: 'update:days', value: number): void
  (e: 'update:failureThreshold', value: number): void
  (e: 'update:cacheHitThreshold', value: number): void
  (e: 'refresh'): void
  (e: 'export'): void
}>()
</script>

<template>
  <div class="toolbar">
    <span class="label">时间范围(天)</span>
    <el-input-number :model-value="props.days" :min="1" :max="30" :step="1" @update:model-value="emit('update:days', $event)" />
    <span class="label">失败阈值</span>
    <el-input-number
      :model-value="props.failureThreshold"
      :min="0"
      :max="1"
      :step="0.05"
      @update:model-value="emit('update:failureThreshold', $event)"
    />
    <span class="label">缓存阈值</span>
    <el-input-number
      :model-value="props.cacheHitThreshold"
      :min="0"
      :max="1"
      :step="0.05"
      @update:model-value="emit('update:cacheHitThreshold', $event)"
    />
    <el-button size="small" @click="emit('refresh')">刷新</el-button>
    <el-button size="small" type="primary" @click="emit('export')">导出CSV</el-button>
  </div>
</template>

<style scoped>
.toolbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 12px;
  color: #64748b;
}
</style>
