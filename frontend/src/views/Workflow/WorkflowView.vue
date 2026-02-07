<script setup lang="ts">
import { computed, ref } from 'vue'
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
const selectedExecution = ref<any>(null)
const showExecutionDialog = ref(false)
let highlightTimer: number | undefined

// 注册自定义节点类型
const nodeTypes = {
  trigger: TriggerNode,
  llm: LLMNode,
  knowledge: KnowledgeNode,
  condition: ConditionNode,
  code: CodeNode,
  end: EndNode,
}

const vueFlow = useVueFlow()
const { onConnect, addEdges, addNodes, project, setCenter, fitView } = vueFlow
const viewportStack = ref<Array<{ x: number; y: number; zoom: number }>>([])
const nodeStyleCache = new Map<string, any>()

// 连接事件：创建边
const getEdgeStyle = (label?: string) => {
  if (label === 'True') {
    return { stroke: '#16a34a', strokeWidth: 2 }
  }
  if (label === 'False') {
    return { stroke: '#dc2626', strokeWidth: 2 }
  }
  return { stroke: '#94a3b8', strokeWidth: 2 }
}

const getEdgeLabelStyle = (label?: string) => {
  if (label === 'True') {
    return { fill: '#16a34a', fontWeight: 600 }
  }
  if (label === 'False') {
    return { fill: '#dc2626', fontWeight: 600 }
  }
  return { fill: '#64748b' }
}

onConnect((params) => {
  // 条件节点的出边标记 True/False，便于画布识别
  const sourceNode = workflowStore.nodes.find(node => node.id === params.source)
  const outgoingCount = workflowStore.edges.filter(edge => edge.source === params.source).length

  let label: string | undefined
  if (sourceNode?.type === 'condition') {
    label = outgoingCount === 0 ? 'True' : 'False'
  }

  if (sourceNode?.type === 'condition' && label) {
    // 记录 True/False 目标节点，后端可直接使用
    if (label === 'True') {
      sourceNode.data = { ...sourceNode.data, trueTarget: params.target }
    } else if (label === 'False') {
      sourceNode.data = { ...sourceNode.data, falseTarget: params.target }
    }
  }

  addEdges([
    {
      ...params,
      label,
      style: getEdgeStyle(label),
      labelStyle: getEdgeLabelStyle(label),
    },
  ])
})

const onEdgeClick = (_: any, edge: any) => {
  const sourceNode = workflowStore.nodes.find(node => node.id === edge.source)
  if (sourceNode?.type !== 'condition') return

  // 点击切换 True/False 标签，便于手动修正
  const nextLabel = edge.label === 'True' ? 'False' : 'True'
  workflowStore.edges = workflowStore.edges.map(item => {
    if (item.id !== edge.id) return item
    return {
      ...item,
      label: nextLabel,
      style: getEdgeStyle(nextLabel),
      labelStyle: getEdgeLabelStyle(nextLabel),
    }
  })

  if (nextLabel === 'True') {
    sourceNode.data = { ...sourceNode.data, trueTarget: edge.target }
  } else {
    sourceNode.data = { ...sourceNode.data, falseTarget: edge.target }
  }
}

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

const highlightNode = (nodeId: string) => {
  // 保存当前视角，便于恢复
  const getViewport = (vueFlow as any).getViewport
  if (getViewport) {
    viewportStack.value.push(getViewport())
  }

  // 高亮节点：给节点添加边框样式
  workflowStore.nodes = workflowStore.nodes.map(node => {
    if (node.id === nodeId) {
      nodeStyleCache.set(node.id, node.style || null)
      return {
        ...node,
        style: {
          ...node.style,
          border: '2px solid #38bdf8',
          borderRadius: '10px',
          boxShadow: '0 0 0 4px rgba(56, 189, 248, 0.25)',
          transition: 'box-shadow 0.3s ease, border 0.3s ease',
        },
      }
    }
    return node
  })

  // 自动居中定位节点，提升定位效率
  const target = workflowStore.nodes.find(node => node.id === nodeId)
  if (target) {
    // 使用 setCenter 动画过渡（若底层不支持 duration，将自动忽略）
    ;(setCenter as any)(target.position.x, target.position.y, { zoom: 1.2, duration: 400 })
  }

  // 自动取消高亮，避免长期高亮造成干扰
  if (highlightTimer) {
    window.clearTimeout(highlightTimer)
  }
  highlightTimer = window.setTimeout(() => {
    workflowStore.nodes = workflowStore.nodes.map(node => {
      if (nodeStyleCache.has(node.id)) {
        const cached = nodeStyleCache.get(node.id)
        nodeStyleCache.delete(node.id)
        return {
          ...node,
          style: cached || undefined,
        }
      }
      return node
    })
  }, 2000)
}

const handleRestoreViewport = () => {
  const setViewport = (vueFlow as any).setViewport
  if (viewportStack.value.length > 0 && setViewport) {
    // 恢复上次视角
    const last = viewportStack.value.pop()
    if (last) {
      setViewport(last, { duration: 300 })
      return
    }
    return
  }
  // 回退：居中并适配全部节点
  if (fitView) {
    ;(fitView as any)({ padding: 0.2, duration: 300 })
  }
}

const handleSelectExecution = (execution: any) => {
  selectedExecution.value = execution
  showExecutionDialog.value = true
}

const formattedExecutionInput = computed(() => {
  return selectedExecution.value?.input
    ? JSON.stringify(selectedExecution.value.input, null, 2)
    : ''
})

const formattedExecutionOutput = computed(() => {
  return selectedExecution.value?.output
    ? JSON.stringify(selectedExecution.value.output, null, 2)
    : ''
})

const conditionTargetOptions = computed(() => {
  // 条件节点目标选项：过滤掉自身，显示名称+ID
  return workflowStore.nodes
    .filter(node => node.id !== selectedNodeId.value)
    .map(node => ({
      label: `${node.data?.label || node.type} (${node.id})`,
      value: node.id,
    }))
})

const formattedExecutionLogs = computed(() => {
  return selectedExecution.value?.logs?.length
    ? selectedExecution.value.logs.join('\n')
    : ''
})

const handleCopyExecution = async () => {
  if (!selectedExecution.value) return
  const payload = {
    status: selectedExecution.value.status,
    startedAt: selectedExecution.value.startedAt,
    completedAt: selectedExecution.value.completedAt,
    errorMessage: selectedExecution.value.errorMessage,
    input: selectedExecution.value.input,
    output: selectedExecution.value.output,
    logs: selectedExecution.value.logs,
  }
  // 复制执行详情到剪贴板，便于复盘与分享
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
}

const handleDownloadLogs = () => {
  if (!selectedExecution.value?.logs?.length) return
  const filename = `execution-${selectedExecution.value.id}.log`
  const blob = new Blob([formattedExecutionLogs.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="page">
    <div class="left">
      <NodePalette />
      <ExecutionLog
        :logs="workflowStore.executionLogs"
        @select-node="highlightNode"
      />
      <ExecutionHistory
        :executions="workflowStore.executions"
        @select="handleSelectExecution"
      />
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
          @edge-click="onEdgeClick"
        >
          <Background />
          <Controls />
        </VueFlow>
      </div>
    </div>

    <NodeConfigDrawer
      v-model="showDrawer"
      :node="workflowStore.nodes.find(n => n.id === selectedNodeId)"
      :node-options="conditionTargetOptions"
      @save="handleSaveConfig"
    />

    <el-dialog v-model="showExecutionDialog" title="执行详情" width="720px">
      <div v-if="selectedExecution" class="execution-detail">
        <div class="section">
          <div class="label">状态</div>
          <div class="value">{{ selectedExecution.status }}</div>
        </div>
        <div class="section">
          <div class="label">开始时间</div>
          <div class="value">{{ selectedExecution.startedAt }}</div>
        </div>
        <div class="section" v-if="selectedExecution.completedAt">
          <div class="label">结束时间</div>
          <div class="value">{{ selectedExecution.completedAt }}</div>
        </div>
        <div class="section" v-if="selectedExecution.errorMessage">
          <div class="label">错误信息</div>
          <div class="value error">{{ selectedExecution.errorMessage }}</div>
        </div>

        <div class="section" v-if="formattedExecutionInput">
          <div class="label">输入</div>
          <pre class="code">{{ formattedExecutionInput }}</pre>
        </div>
        <div class="section" v-if="formattedExecutionOutput">
          <div class="label">输出</div>
          <pre class="code">{{ formattedExecutionOutput }}</pre>
        </div>
        <div class="section" v-if="selectedExecution.logs?.length">
          <div class="label">日志</div>
          <div class="log-list">
            <div v-for="(line, index) in selectedExecution.logs" :key="index" class="log-item">
              {{ line }}
            </div>
          </div>
        </div>

        <div class="actions">
          <el-button @click="handleCopyExecution">复制详情</el-button>
          <el-button type="primary" @click="handleDownloadLogs">下载日志</el-button>
        </div>
      </div>
    </el-dialog>
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

.execution-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section {
  display: flex;
  gap: 12px;
}

.label {
  width: 80px;
  font-weight: 600;
  color: #334155;
}

.value {
  color: #0f172a;
}

.value.error {
  color: #b91c1c;
}

.code {
  background: #0f172a;
  color: #e2e8f0;
  padding: 10px;
  border-radius: 8px;
  width: 100%;
  overflow: auto;
}

.log-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-item {
  font-size: 12px;
  color: #334155;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
