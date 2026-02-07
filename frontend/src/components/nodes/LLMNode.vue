<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

// LLM 节点：负责调用大模型
defineProps<{ data: { label: string; model?: string } }>()
</script>

<template>
  <div class="node llm">
    <Handle type="target" :position="Position.Left" />
    <div class="title">🤖 {{ data.label || 'LLM' }}</div>
    <div class="desc">模型：{{ data.model || 'gpt-4o-mini' }}</div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.node {
  padding: 10px 12px;
  border-radius: 10px;
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  min-width: 160px;
}

.llm {
  background: #e0f2fe;
  border-color: #7dd3fc;
}

.title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
}

.desc {
  font-size: 12px;
  color: #475569;
}
</style>
