<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

// 条件分支节点：用于流程分流
defineProps<{ data: { label: string } }>()
</script>

<template>
  <div class="node condition">
    <Handle type="target" :position="Position.Left" />
    <div class="title">⚡ {{ data.label || '条件' }}</div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.node {
  padding: 10px 12px;
  border-radius: 10px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  min-width: 140px;
}

.condition {
  background: #fee2e2;
  border-color: #fecaca;
}

.title {
  font-weight: 600;
  font-size: 13px;
}
</style>
