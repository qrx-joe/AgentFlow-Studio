<script setup lang="ts">
import { ref } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/background/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'

import { useWorkflowStore } from '@/stores/workflow'
import NodePalette from '@/components/workflow/NodePalette.vue'
import NodeToolbar from '@/components/workflow/NodeToolbar.vue'
import NodeConfigDrawer from '@/components/workflow/NodeConfigDrawer.vue'
import ExecutionLog from '@/components/workflow/ExecutionLog.vue'
import ExecutionHistory from '@/components/workflow/ExecutionHistory.vue'

import TriggerNode from '@/components/nodes/TriggerNode.vue'
import LLMNode from '@/components/nodes/LLMNode.vue'
import KnowledgeNode from '@/components/nodes/KnowledgeNode.vue'
import ConditionNode from '@/components/nodes/ConditionNode.vue'
import CodeNode from '@/components/nodes/CodeNode.vue'
import EndNode from '@/components/nodes/EndNode.vue'

const workflowStore = useWorkflowStore()
const selectedNodeId = ref('')
const showDrawer = ref(false)

// 注册自定义节点类型
const nodeTypes = {
  trigger: TriggerNode,
  llm: LLMNode,
  knowledge: KnowledgeNode,
  condition: ConditionNode,
  code: CodeNode,
  end: EndNode,
}

const { onConnect, addEdges, addNodes, project } = useVueFlow()

// 连接事件：创建边
onConnect((params) => {
  // addEdges 会更新 v-model 绑定的 edges
  addEdges([params])
})

// 拖拽进入画布时允许放置
const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

// 放置节点到画布
const onDrop = (event: DragEvent) => {
  event.preventDefault()
  if (!event.dataTransfer) return

  const nodeType = event.dataTransfer.getData('application/vueflow')
  if (!nodeType) return

  const position = project({ x: event.offsetX, y: event.offsetY })
  const id = `node-${Date.now()}`

  const node = {
    id,
    type: nodeType,
    position,
    data: { label: '新节点' },
  }

  // addNodes 会更新 v-model 绑定的 nodes
  addNodes([node])
}

// 双击节点打开配置
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
  await workflowStore.saveWorkflow()
  workflowStore.addLog('工作流已保存')
  await workflowStore.fetchExecutions()
}

const handleRunWorkflow = async () => {
  const result = await workflowStore.executeWorkflow('示例输入')
  workflowStore.addLog(`执行完成：${result?.status || 'success'}`)
}

const handleClear = () => {
  workflowStore.setCanvas([], [])
}
</script>

<template>
  <div class="page">
    <div class="left">
      <NodePalette />
      <ExecutionLog :logs="workflowStore.executionLogs" />
    </div>

    <div class="center">
      <NodeToolbar
        :saving="workflowStore.saving"
        :executing="workflowStore.executing"
        @save="handleSaveWorkflow"
        @run="handleRunWorkflow"
        @clear="handleClear"
      />

      <div class="canvas" @dragover="onDragOver" @drop="onDrop">
        <VueFlow
          v-model:nodes="workflowStore.nodes"
          v-model:edges="workflowStore.edges"
          :node-types="nodeTypes"
          @node-double-click="onNodeDoubleClick"
        >
          <Background />
          <Controls />
        </VueFlow>
      </div>
    </div>

    <NodeConfigDrawer
      v-model="showDrawer"
      :node="workflowStore.nodes.find(n => n.id === selectedNodeId)"
      @save="handleSaveConfig"
    />
  </div>
</template>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  height: 100%;
}

.left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.center {
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
