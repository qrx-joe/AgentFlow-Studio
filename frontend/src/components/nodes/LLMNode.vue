<script setup lang="ts">
import { Cpu } from '@element-plus/icons-vue'
import BaseNode from './BaseNode.vue'

defineProps<{
    data: { label: string; model?: string; systemPrompt?: string; status?: string },
    selected?: boolean
}>()
</script>

<template>
  <BaseNode
    :label="data.label || '大模型 LLM'"
    :icon="Cpu"
    color="#0ea5e9"
    :selected="selected"
    :status="data.status"
  >
    <div class="node-content">
      <div class="param-row">
        <span class="label">模型:</span>
        <span class="value">{{ data.model || 'gpt-3.5-turbo' }}</span>
      </div>
      <div class="param-row" v-if="data.systemPrompt">
        <span class="label">提示词:</span>
        <span class="value prompt">{{ data.systemPrompt }}</span>
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
  align-items: flex-start;
  font-size: 12px;
  gap: 8px;
}

.label {
  color: var(--color-neutral-500);
  flex-shrink: 0;
}

.value {
  color: var(--color-neutral-800);
  font-family: var(--font-family-mono);
  background: var(--color-neutral-100);
  padding: 1px 4px;
  border-radius: 4px;
}

.prompt {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    max-width: 140px;
}
</style>
