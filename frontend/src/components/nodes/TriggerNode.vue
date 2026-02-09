<script setup lang="ts">
import { Lightning } from '@element-plus/icons-vue'
import BaseNode from './BaseNode.vue'

defineProps<{ 
    data: { label: string },
    selected?: boolean 
}>()
</script>

<template>
  <BaseNode
    :label="data.label || '触发器'"
    :icon="Lightning"
    color="#f59e0b"
    :selected="selected"
    :status="data.status"
  >
    <div class="node-info">
      用户输入消息时触发
    </div>
  </BaseNode>
</template>

<style scoped>
.node-info {
  color: var(--color-neutral-500);
  font-size: 12px;
}
</style>
