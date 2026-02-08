<script setup lang="ts">
import NodePalette from '@/components/workflow/NodePalette.vue'
import ExecutionLog from '@/components/workflow/ExecutionLog.vue'
import ExecutionHistory from '@/components/workflow/ExecutionHistory.vue'

const props = defineProps<{
  logs: string[]
  executions: any[]
  filterStatus: string
}>()

const emit = defineEmits<{
  (e: 'selectNode', nodeId: string): void
  (e: 'selectExecution', execution: any): void
  (e: 'filterChange', status: string): void
  (e: 'export', format: 'md' | 'json' | 'txt'): void
}>()
</script>

<template>
  <div class="sidebar">
    <NodePalette />
    <ExecutionLog :logs="props.logs" @select-node="emit('selectNode', $event)" />
    <ExecutionHistory
      :executions="props.executions"
      :filter-status="props.filterStatus"
      @select="emit('selectExecution', $event)"
      @filter-change="emit('filterChange', $event)"
      @export="emit('export', $event)"
    />
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
