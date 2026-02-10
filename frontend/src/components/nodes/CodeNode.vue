<script setup lang="ts">
import { VideoPlay } from '@element-plus/icons-vue'
import BaseNode from './BaseNode.vue'

defineProps<{
    data: { label: string; code?: string; status?: string },
    selected?: boolean
}>()
</script>

<template>
  <BaseNode
    :label="data.label || '代码执行'"
    :icon="VideoPlay"
    color="#6366f1"
    :selected="selected"
    :status="data.status"
  >
    <div class="code-preview">
        {{ data.code || '// Write code here' }}
    </div>
  </BaseNode>
</template>

<style scoped>
.code-preview {
    font-family: monospace;
    font-size: 11px;
    color: var(--color-neutral-600);
    background: var(--color-neutral-50);
    padding: 8px;
    border-radius: 4px;
    white-space: pre-wrap;
    max-height: 60px;
    overflow: hidden;
}
</style>
