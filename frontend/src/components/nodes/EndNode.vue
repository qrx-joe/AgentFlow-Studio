<script setup lang="ts">
import { SwitchButton } from '@element-plus/icons-vue';
import BaseNode from './BaseNode.vue';

defineProps<{
  data: { label: string; status?: string };
  selected?: boolean;
}>();
</script>

<template>
  <BaseNode
    :label="data.label || '结束'"
    :icon="SwitchButton"
    color="#ef4444"
    :selected="selected"
    :status="data.status"
  >
    <div class="node-info">流程结束并输出结果</div>
  </BaseNode>
</template>

<style scoped>
.node-info {
  color: var(--color-neutral-500);
  font-size: 12px;
}
</style>
