<script setup lang="ts">
import { Connection } from '@element-plus/icons-vue'
import BaseNode from './BaseNode.vue'

defineProps<{
    data: { label: string; expression?: string; status?: string },
    selected?: boolean
}>()
</script>

<template>
  <BaseNode
    :label="data.label || '条件判断'"
    :icon="Connection"
    color="#8b5cf6"
    :selected="selected"
    :status="data.status"
  >
     <div class="node-content">
      <div class="param-row">
        <span class="label">If:</span>
        <span class="value code">{{ data.expression || 'x > 0' }}</span>
      </div>
      <div class="branches">
        <span class="branch true">True</span>
        <span class="branch false">False</span>
      </div>
    </div>
  </BaseNode>
</template>

<style scoped>
.node-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-row {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.label { color: var(--color-neutral-500); }
.value.code { 
    font-family: monospace; 
    background: var(--color-neutral-100); 
    padding: 2px 4px; 
    border-radius: 4px; 
}

.branches {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--color-neutral-400);
}
</style>
