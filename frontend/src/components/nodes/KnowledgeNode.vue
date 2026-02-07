<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

// 知识检索节点：执行 RAG 检索
defineProps<{ data: { label: string; topK?: number } }>()
</script>

<template>
  <div class="node knowledge">
    <Handle type="target" :position="Position.Left" />
    <div class="title">📚 {{ data.label || '知识检索' }}</div>
    <div class="desc">TopK：{{ data.topK || 3 }}</div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.node {
  padding: 10px 12px;
  border-radius: 10px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  min-width: 160px;
}

.knowledge {
  background: #fef9c3;
  border-color: #fde047;
}

.title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
}

.desc {
  font-size: 12px;
  color: #64748b;
}
</style>
