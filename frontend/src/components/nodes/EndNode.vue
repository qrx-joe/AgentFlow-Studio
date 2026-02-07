<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

// 结束节点：流程出口
defineProps<{ data: { label: string } }>()
</script>

<template>
  <div class="node end">
    <Handle type="target" :position="Position.Left" />
    <div class="title">⏹️ {{ data.label || '结束' }}</div>
  </div>
</template>

<style scoped>
.node {
  padding: 10px 12px;
  border-radius: 10px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  min-width: 120px;
}

.end {
  background: #e2e8f0;
  border-color: #94a3b8;
}

.title {
  font-weight: 600;
  font-size: 13px;
}
</style>
