<script setup lang="ts">
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/controls/dist/style.css'
import NodeToolbar from '@/components/workflow/NodeToolbar.vue'

const nodes = defineModel<any[]>('nodes', { required: true })
const edges = defineModel<any[]>('edges', { required: true })

const props = defineProps<{
  flowId?: string
  nodeTypes: Record<string, any>
  edgeTypes: Record<string, any>
  saving: boolean
  executing: boolean
  replaying: boolean
  replaySpeed: number
  replayProgress: number
  replayTotal: number
  preserveTrail: boolean
  compareLast: boolean
  snapshotOptions: Array<{ label: string; value: string }>
  selectedSnapshotId: string
  applySnapshotMeta: boolean
  onDragOver: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
}>()

const emit = defineEmits<{
  (e: 'update:replaySpeed', value: number): void
  (e: 'update:preserveTrail', value: boolean): void
  (e: 'update:compareLast', value: boolean): void
  (e: 'update:selectedSnapshotId', value: string): void
  (e: 'update:applySnapshotMeta', value: boolean): void
  (e: 'save'): void
  (e: 'run'): void
  (e: 'clear'): void
  (e: 'restore'): void
  (e: 'replay'): void
  (e: 'stopReplay'): void
  (e: 'seekReplay', value: number): void
  (e: 'clearTrail'): void
  (e: 'saveSnapshot'): void
  (e: 'deleteSnapshot'): void
  (e: 'renameSnapshot'): void
  (e: 'clearSnapshots'): void
  (e: 'exportSnapshot'): void
  (e: 'importSnapshot'): void
  (e: 'exportAllSnapshots'): void
  (e: 'exportReplayScript'): void
  (e: 'exportReplayJson'): void
  (e: 'exportReplayTxt'): void
  (e: 'nodeClick', node: any): void
  (e: 'nodeDoubleClick', node: any): void
  (e: 'paneClick'): void
  (e: 'edgeClick', edge: any): void
}>()
</script>

<template>
  <div class="canvas-panel">
    <NodeToolbar
      :saving="props.saving"
      :executing="props.executing"
      :replaying="props.replaying"
      :replay-speed="props.replaySpeed"
      :replay-progress="props.replayProgress"
      :replay-total="props.replayTotal"
      :preserve-trail="props.preserveTrail"
      :compare-last="props.compareLast"
      :snapshot-options="props.snapshotOptions"
      :selected-snapshot-id="props.selectedSnapshotId"
      :apply-snapshot-meta="props.applySnapshotMeta"
      :minimal="true"
      @save="emit('save')"
      @run="emit('run')"
      @clear="emit('clear')"
      @restore="emit('restore')"
      @replay="emit('replay')"
      @stop-replay="emit('stopReplay')"
      @update:replay-speed="emit('update:replaySpeed', $event)"
      @seek-replay="emit('seekReplay', $event)"
      @update:preserve-trail="emit('update:preserveTrail', $event)"
      @update:compare-last="emit('update:compareLast', $event)"
      @clear-trail="emit('clearTrail')"
      @save-snapshot="emit('saveSnapshot')"
      @update:selected-snapshot-id="emit('update:selectedSnapshotId', $event)"
      @delete-snapshot="emit('deleteSnapshot')"
      @rename-snapshot="emit('renameSnapshot')"
      @clear-snapshots="emit('clearSnapshots')"
      @export-snapshot="emit('exportSnapshot')"
      @import-snapshot="emit('importSnapshot')"
      @export-all-snapshots="emit('exportAllSnapshots')"
      @update:apply-snapshot-meta="emit('update:applySnapshotMeta', $event)"
      @export-replay-script="emit('exportReplayScript')"
      @export-replay-json="emit('exportReplayJson')"
      @export-replay-txt="emit('exportReplayTxt')"
    />

    <div class="canvas" @dragover="props.onDragOver" @drop="props.onDrop">
      <VueFlow
        :id="props.flowId"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="props.nodeTypes"
        :edge-types="props.edgeTypes"
        @node-click="(event: any) => emit('nodeClick', event.node)"
        @node-double-click="(event: any) => emit('nodeDoubleClick', event.node)"
        @pane-click="() => emit('paneClick')"
        @edge-click="(event: any) => emit('edgeClick', event.edge)"
      >
        <Background />
        <Controls />
      </VueFlow>
    </div>
  </div>
</template>

<style scoped>
.canvas-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.canvas {
  flex: 1;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}
</style>
