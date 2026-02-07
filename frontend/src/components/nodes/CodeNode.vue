<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

// 代码节点：执行自定义逻辑（示例占位）
defineProps<{ data: { label: string } }>()
</script>

<template>
  <div class="node code">
    <Handle type="target" :position="Position.Left" />
    <div class="title">💻 {{ data.label || '代码' }}</div>
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

.code {
  background: #ede9fe;
  border-color: #c4b5fd;
}

.title {
  font-weight: 600;
  font-size: 13px;
}
</style>
