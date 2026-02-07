<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

// 条件分支节点：用于流程分流
defineProps<{ data: { label: string } }>()
</script>

<template>
  <div class="node condition">
    <Handle type="target" :position="Position.Left" />
    <div class="title">⚡ {{ data.label || '条件' }}</div>
    <!-- True/False 侧标签仅用于提示分支含义，不绑定具体连线 -->
    <div class="branch">
      <span class="tag true">True</span>
      <span class="tag false">False</span>
    </div>
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

.branch {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.tag.true {
  color: #16a34a;
  border-color: #86efac;
}

.tag.false {
  color: #dc2626;
  border-color: #fecaca;
}
</style>
