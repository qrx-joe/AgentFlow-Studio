<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

// 触发节点：工作流入口
defineProps<{ data: { label: string } }>()
</script>

<template>
  <div class="node trigger">
    <div class="title">▶️ {{ data.label || '触发' }}</div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.node {
  padding: 10px 12px;
  border-radius: 10px;
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  min-width: 120px;
}

.trigger {
  background: #dcfce7;
  border-color: #86efac;
}

.title {
  font-weight: 600;
  font-size: 13px;
}
</style>
