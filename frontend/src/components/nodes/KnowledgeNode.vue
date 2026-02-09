<script setup lang="ts">
import { Files } from '@element-plus/icons-vue'
import BaseNode from './BaseNode.vue'

defineProps<{ 
    data: { label: string; dataset?: string; topK?: number },
    selected?: boolean 
}>()
</script>

<template>
  <BaseNode
    :label="data.label || '知识库检索'"
    :icon="Files"
    color="#10b981"
    :selected="selected"
    :status="data.status"
  >
    <div class="node-content">
      <div class="param-row">
        <span class="label">知识库:</span>
        <span class="value">{{ data.dataset || '默认' }}</span>
      </div>
      <div class="param-row">
        <span class="label">TopK:</span>
        <span class="value">{{ data.topK || 3 }}</span>
      </div>
    </div>
  </BaseNode>
</template>

<style scoped>
.node-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.label { color: var(--color-neutral-500); }
.value { color: var(--color-neutral-800); font-weight: 500; }
</style>
