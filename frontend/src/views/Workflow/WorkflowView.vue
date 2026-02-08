<script setup lang="ts">
import { computed, ref } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import { ElMessage } from 'element-plus'
import BranchEdge from '@/components/workflow/BranchEdge.vue'
import NodeConfigDrawer from '@/components/workflow/NodeConfigDrawer.vue'
import ExecutionDetailDialog from '@/components/workflow/ExecutionDetailDialog.vue'
import WorkflowSidebarPanel from '@/components/workflow/panels/WorkflowSidebarPanel.vue'
import WorkflowCanvasPanel from '@/components/workflow/panels/WorkflowCanvasPanel.vue'
import TriggerNode from '@/components/nodes/TriggerNode.vue'
import LLMNode from '@/components/nodes/LLMNode.vue'
import KnowledgeNode from '@/components/nodes/KnowledgeNode.vue'
import ConditionNode from '@/components/nodes/ConditionNode.vue'
import CodeNode from '@/components/nodes/CodeNode.vue'
import EndNode from '@/components/nodes/EndNode.vue'
import { useWorkflowStore } from '@/stores/workflow'
import { useWorkflowEdgeHandlers } from '@/composables/workflow/useWorkflowEdgeHandlers'
import { useWorkflowDragDrop } from '@/composables/workflow/useWorkflowDragDrop'
import { useWorkflowValidation } from '@/composables/workflow/useWorkflowValidation'
import { useWorkflowHighlight } from '@/composables/workflow/useWorkflowHighlight'
import { useWorkflowReplay } from '@/composables/workflow/useWorkflowReplay'
import { useWorkflowSnapshots } from '@/composables/workflow/useWorkflowSnapshots'
import { useWorkflowExecutions } from '@/composables/workflow/useWorkflowExecutions'
import { useWorkflowReplayExports } from '@/composables/workflow/useWorkflowReplayExports'
import { useWorkflowExecutionExports } from '@/composables/workflow/useWorkflowExecutionExports'

const workflowStore = useWorkflowStore()
const selectedNodeId = ref('')
const showDrawer = ref(false)
const nodeTypes = {
  trigger: TriggerNode,
  llm: LLMNode,
  knowledge: KnowledgeNode,
  condition: ConditionNode,
  code: CodeNode,
  end: EndNode,
}

const edgeTypes = {
  default: BranchEdge,
  step: BranchEdge,
}

const vueFlow = useVueFlow()
const { onConnect, addEdges, addNodes, project, setCenter, fitView } = vueFlow
const getViewport = (vueFlow as any).getViewport
const setViewport = (vueFlow as any).setViewport
const { handleConnect, handleEdgeClick } = useWorkflowEdgeHandlers(workflowStore, addEdges)
onConnect(handleConnect)
const { onDragOver, onDrop } = useWorkflowDragDrop(project, addNodes)
const { validateWorkflow } = useWorkflowValidation(workflowStore)
const { highlightNode, highlightEdgeByNodes, restoreEdgeHighlight, handleRestoreViewport } =
  useWorkflowHighlight({ workflowStore, setCenter, fitView, getViewport, setViewport })
const {
  replaying,
  replaySpeed,
  replayProgress,
  replayTotal,
  preserveTrail,
  compareLast,
  replayEdges,
  startReplay,
  stopReplay,
  seekReplay,
  clearTrail,
  applyCompareEdges,
  removeCompareEdges,
} = useWorkflowReplay({ workflowStore, highlightNode, highlightEdgeByNodes, restoreEdgeHighlight })

const {
  selectedSnapshotId,
  applySnapshotMeta,
  snapshotOptions,
  saveSnapshot,
  deleteSnapshot,
  renameSnapshot,
  clearSnapshots,
  exportSnapshot,
  exportAllSnapshots,
  handleImportSnapshot,
} = useWorkflowSnapshots({
  replayEdges,
  applyCompareEdges,
  removeCompareEdges,
  replaySpeed,
  preserveTrail,
  compareLast,
})

const {
  selectedExecution,
  showExecutionDialog,
  executionFilterStatus,
  handleSelectExecution,
  formattedExecutionInput,
  formattedExecutionOutput,
  executionLogGroups,
  collapsedGroups,
  toggleGroup,
  handleCopyExecution,
  handleDownloadLogs,
  filteredExecutions,
  getNodeIdFromLog,
} = useWorkflowExecutions(workflowStore)

const { exportReplayScript, exportReplayJson, exportReplayTxt, buildNodeConfigSummary } =
  useWorkflowReplayExports({ workflowStore, getNodeIdFromLog })
const {
  exportReplayScriptFromExecution,
  exportReplayJsonFromExecution,
  exportReplayTxtFromExecution,
  exportExecutionHistory,
} = useWorkflowExecutionExports({
  workflowStore,
  filteredExecutions,
  selectedExecution,
  getNodeIdFromLog,
  buildNodeConfigSummary,
  exportReplayJson,
  exportReplayTxt,
})

const onNodeDoubleClick = (_: any, node: any) => {
  selectedNodeId.value = node.id
  showDrawer.value = true
}

const handleSaveConfig = (nodeId: string, data: Record<string, any>) => {
  const node = workflowStore.nodes.find(n => n.id === nodeId)
  if (node) {
    node.data = { ...node.data, ...data }
  }
}

const handleSaveWorkflow = async () => {
  if (!validateWorkflow()) return
  await workflowStore.saveWorkflow()
  workflowStore.addLog('工作流已保存')
  await workflowStore.fetchExecutions()
}

const handleRunWorkflow = async () => {
  if (!validateWorkflow()) return
  const result = await workflowStore.executeWorkflow('示例输入')
  workflowStore.addLog(`执行完成：${result?.status || 'success'}`)
}

const handleClear = () => {
  workflowStore.setCanvas([], [])
}
const startReplayFromExecution = () => {
  if (!selectedExecution.value?.logs?.length) {
    ElMessage.warning('该执行记录没有可回放日志')
    return
  }
  startReplay(selectedExecution.value.logs)
}

const conditionTargetOptions = computed(() => {
  return workflowStore.nodes
    .filter(node => node.id !== selectedNodeId.value)
    .map(node => ({ label: `${node.data?.label || node.type} (${node.id})`, value: node.id }))
})
</script>

<template>
  <div class="page">
    <WorkflowSidebarPanel :logs="workflowStore.executionLogs" :executions="filteredExecutions" :filter-status="executionFilterStatus" @select-node="highlightNode" @select-execution="handleSelectExecution" @filter-change="executionFilterStatus = $event" @export="exportExecutionHistory" />
    <WorkflowCanvasPanel v-model:nodes="workflowStore.nodes" v-model:edges="workflowStore.edges" :node-types="nodeTypes" :edge-types="edgeTypes" :saving="workflowStore.saving" :executing="workflowStore.executing" :replaying="replaying" :replay-speed="replaySpeed" :replay-progress="replayProgress" :replay-total="replayTotal" :preserve-trail="preserveTrail" :compare-last="compareLast" :snapshot-options="snapshotOptions" :selected-snapshot-id="selectedSnapshotId" :apply-snapshot-meta="applySnapshotMeta" :on-drag-over="onDragOver" :on-drop="onDrop" @save="handleSaveWorkflow" @run="handleRunWorkflow" @clear="handleClear" @restore="handleRestoreViewport" @replay="startReplay" @stop-replay="stopReplay" @seek-replay="seekReplay" @clear-trail="clearTrail" @save-snapshot="saveSnapshot" @delete-snapshot="deleteSnapshot" @rename-snapshot="renameSnapshot" @clear-snapshots="clearSnapshots" @export-snapshot="exportSnapshot" @export-all-snapshots="exportAllSnapshots" @import-snapshot="handleImportSnapshot" @export-replay-script="exportReplayScript" @export-replay-json="exportReplayJson" @export-replay-txt="exportReplayTxt" @update:replay-speed="replaySpeed = $event" @update:preserve-trail="preserveTrail = $event" @update:compare-last="compareLast = $event" @update:selected-snapshot-id="selectedSnapshotId = $event" @update:apply-snapshot-meta="applySnapshotMeta = $event" @node-double-click="onNodeDoubleClick" @edge-click="handleEdgeClick" />
    <NodeConfigDrawer v-model="showDrawer" :node="workflowStore.nodes.find(n => n.id === selectedNodeId)" :node-options="conditionTargetOptions" @save="handleSaveConfig" />
    <ExecutionDetailDialog v-model="showExecutionDialog" :execution="selectedExecution" :formatted-execution-input="formattedExecutionInput" :formatted-execution-output="formattedExecutionOutput" :execution-log-groups="executionLogGroups" :collapsed-groups="collapsedGroups" @toggle-group="toggleGroup" @select-node="highlightNode" @copy="handleCopyExecution" @download-logs="handleDownloadLogs" @replay="startReplayFromExecution" @export-script="exportReplayScriptFromExecution" @export-json="exportReplayJsonFromExecution" @export-txt="exportReplayTxtFromExecution" />
  </div>
</template>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  height: 100%;
}

</style>
