<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/background/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { ElMessage, ElMessageBox } from 'element-plus'

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
let replayTimer: number | undefined
let edgeHighlightTimer: number | undefined
const replaying = ref(false)
const replaySpeed = ref(1200)
const replayProgress = ref(0)
const replayTotal = ref(0)
const replayNodes = ref<string[]>([])
const lastHighlightedEdgeId = ref('')
const preserveTrail = ref(true)
const compareLast = ref(false)
const replayEdges = ref<Set<string>>(new Set())
const lastReplayEdges = ref<string[]>([])
const trailStyleCache = new Map<string, any>()
const snapshots = ref<Array<{ id: string; label: string; edgeIds: string[] }>>([])
const selectedSnapshotId = ref('')

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
const nodeClassCache = new Map<string, any>()
const edgeStyleCache = new Map<string, any>()
const edgeClassCache = new Map<string, any>()

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
    return { fill: '#166534', fontWeight: 600 }
  }
  if (label === 'False') {
    return { fill: '#991b1b', fontWeight: 600 }
  }
  return { fill: '#64748b' }
}

const getEdgeLabelBgStyle = (label?: string) => {
  if (label === 'True') {
    return { fill: '#dcfce7', stroke: '#86efac', strokeWidth: 1, rx: 6, ry: 6 }
  }
  if (label === 'False') {
    return { fill: '#fee2e2', stroke: '#fecaca', strokeWidth: 1, rx: 6, ry: 6 }
  }
  return { fill: '#f1f5f9', stroke: '#e2e8f0', strokeWidth: 1, rx: 6, ry: 6 }
}

onConnect((params) => {
  // 条件节点的出边标记 True/False，便于画布识别
  const sourceNode = workflowStore.nodes.find(node => node.id === params.source)
  const targetNode = workflowStore.nodes.find(node => node.id === params.target)

  // 禁止自环连接
  if (params.source === params.target) {
    ElMessage.warning('不允许节点连接自身')
    return
  }

  // 触发节点不允许被连接为目标
  if (targetNode?.type === 'trigger') {
    ElMessage.warning('触发节点不能作为目标节点')
    return
  }

  // 结束节点不允许作为源节点
  if (sourceNode?.type === 'end') {
    ElMessage.warning('结束节点不能再连接出边')
    return
  }

  // 禁止重复连线（任意节点）
  const duplicateEdge = workflowStore.edges.some(
    edge => edge.source === params.source && edge.target === params.target
  )
  if (duplicateEdge) {
    ElMessage.warning('该连线已存在')
    return
  }

  // 简单环检测：如果目标节点能回到源节点，新增边会造成环
  const createsCycle = (() => {
    const adjacency = new Map<string, string[]>()
    workflowStore.edges.forEach(edge => {
      const list = adjacency.get(edge.source) || []
      list.push(edge.target)
      adjacency.set(edge.source, list)
    })

    const visited = new Set<string>()
    const stack = [params.target]

    while (stack.length > 0) {
      const current = stack.pop() as string
      if (current === params.source) {
        return true
      }
      if (visited.has(current)) {
        continue
      }
      visited.add(current)
      const next = adjacency.get(current) || []
      stack.push(...next)
    }
    return false
  })()

  if (createsCycle) {
    ElMessage.warning('该连线会导致循环依赖')
    return
  }

  // 非条件节点多出边提醒（允许，但提示）
  if (sourceNode && sourceNode.type !== 'condition') {
    const existingOutgoing = workflowStore.edges.filter(edge => edge.source === params.source).length
    if (existingOutgoing >= 1) {
      ElMessage.warning('该节点已存在出边，请确认是否需要多分支')
    }
  }
  const outgoingCount = workflowStore.edges.filter(edge => edge.source === params.source).length

  let label: string | undefined
  if (sourceNode?.type === 'condition') {
    if (outgoingCount >= 2) {
      ElMessage.warning('条件节点最多只能有两条分支')
      return
    }
    label = outgoingCount === 0 ? 'True' : 'False'
    // 条件节点分支不允许重复指向同一目标
    const duplicateTarget = workflowStore.edges.some(
      edge => edge.source === params.source && edge.target === params.target
    )
    if (duplicateTarget) {
      ElMessage.warning('条件节点分支已连接到该目标')
      return
    }
  }

  if (sourceNode?.type === 'condition' && label) {
    // 记录 True/False 目标边 ID，后端可直接使用
    if (label === 'True') {
      sourceNode.data = { ...sourceNode.data, trueEdgeId: params.id, trueTarget: params.target }
    } else if (label === 'False') {
      sourceNode.data = { ...sourceNode.data, falseEdgeId: params.id, falseTarget: params.target }
    }
  }

  addEdges([
    {
      ...params,
      label,
      branchType: label,
      style: getEdgeStyle(label),
      labelStyle: getEdgeLabelStyle(label),
      labelBgStyle: getEdgeLabelBgStyle(label),
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
      branchType: nextLabel,
      style: getEdgeStyle(nextLabel),
      labelStyle: getEdgeLabelStyle(nextLabel),
      labelBgStyle: getEdgeLabelBgStyle(nextLabel),
    }
  })

  const siblings = workflowStore.edges.filter(item => item.source === edge.source && item.id !== edge.id)
  if (nextLabel === 'True') {
    // 将当前边设为 True，其他边设为 False/清空
    sourceNode.data = {
      ...sourceNode.data,
      trueEdgeId: edge.id,
      trueTarget: edge.target,
      falseEdgeId: siblings[0]?.id,
      falseTarget: siblings[0]?.target,
    }
    workflowStore.edges = workflowStore.edges.map(item => {
      if (item.source !== edge.source || item.id === edge.id) return item
      return {
        ...item,
        label: 'False',
        branchType: 'False',
        style: getEdgeStyle('False'),
        labelStyle: getEdgeLabelStyle('False'),
        labelBgStyle: getEdgeLabelBgStyle('False'),
      }
    })
  } else {
    sourceNode.data = {
      ...sourceNode.data,
      falseEdgeId: edge.id,
      falseTarget: edge.target,
      trueEdgeId: siblings[0]?.id,
      trueTarget: siblings[0]?.target,
    }
    workflowStore.edges = workflowStore.edges.map(item => {
      if (item.source !== edge.source || item.id === edge.id) return item
      return {
        ...item,
        label: 'True',
        branchType: 'True',
        style: getEdgeStyle('True'),
        labelStyle: getEdgeLabelStyle('True'),
        labelBgStyle: getEdgeLabelBgStyle('True'),
      }
    })
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

const getNodeIdsFromLogs = (logs: string[]) => {
  return logs
    .filter(line => line.includes('执行节点：'))
    .map(line => getNodeIdFromLog(line))
    .filter(Boolean)
}

const startReplay = (logs?: string[]) => {
  const sourceLogs = logs || workflowStore.executionLogs
  const nodeIds = getNodeIdsFromLogs(sourceLogs)
  if (nodeIds.length === 0) {
    ElMessage.warning('暂无可回放的执行日志')
    return
  }

  stopReplay()
  replaying.value = true
  replayEdges.value.clear()

  // 若启用对比，上一次回放路径作为参考轨迹
  workflowStore.edges = workflowStore.edges.map(edge => ({
    ...edge,
    class: removeClass(edge.class, 'edge-compare'),
  }))
  if (compareLast.value && lastReplayEdges.value.length > 0) {
    applyCompareEdges(lastReplayEdges.value)
  }

  replayNodes.value = nodeIds
  replayTotal.value = nodeIds.length
  replayProgress.value = 0

  let previousId: string | undefined

  const tick = () => {
    const nodeId = replayNodes.value[replayProgress.value]
    if (nodeId) {
      highlightNode(nodeId)
      const edgeId = highlightEdgeByNodes(previousId, nodeId)
      if (edgeId && preserveTrail.value) {
        addTrailEdge(edgeId, replayProgress.value)
      }
    }
    previousId = nodeId
    replayProgress.value += 1
    if (replayProgress.value >= replayNodes.value.length) {
      stopReplay()
    }
  }

  tick()
  replayTimer = window.setInterval(tick, replaySpeed.value)
}

const stopReplay = () => {
  if (replayTimer) {
    window.clearInterval(replayTimer)
    replayTimer = undefined
  }
  replaying.value = false
  replayNodes.value = []
  replayProgress.value = 0
  replayTotal.value = 0
  restoreEdgeHighlight()
  if (replayEdges.value.size > 0) {
    lastReplayEdges.value = Array.from(replayEdges.value)
  }
}

const startReplayFromExecution = () => {
  if (!selectedExecution.value?.logs?.length) {
    ElMessage.warning('该执行记录没有可回放日志')
    return
  }
  startReplay(selectedExecution.value.logs)
}

const seekReplay = (index: number) => {
  if (replayNodes.value.length === 0) return
  const clamped = Math.min(Math.max(index, 0), replayNodes.value.length - 1)
  replayProgress.value = clamped
  const nodeId = replayNodes.value[clamped]
  if (nodeId) {
    highlightNode(nodeId)
    const previous = replayNodes.value[clamped - 1]
    const edgeId = highlightEdgeByNodes(previous, nodeId)
    if (edgeId && preserveTrail.value) {
      addTrailEdge(edgeId, clamped)
    }
  }
}

// 记忆回放速度（本地缓存）
const replaySpeedKey = 'workflowReplaySpeed'
const cachedSpeed = Number(localStorage.getItem(replaySpeedKey))
if (!Number.isNaN(cachedSpeed) && cachedSpeed > 0) {
  replaySpeed.value = cachedSpeed
}

watch(replaySpeed, (value) => {
  localStorage.setItem(replaySpeedKey, String(value))
  // 若正在回放，更新间隔
  if (replaying.value) {
    stopReplay()
    startReplay()
  }
})

watch(selectedSnapshotId, (value) => {
  if (value) {
    applySnapshotCompare(value)
    localStorage.setItem(snapshotSelectionKey, value)
  } else {
    workflowStore.edges = workflowStore.edges.map(edge => ({
      ...edge,
      class: removeClass(edge.class, 'edge-compare'),
    }))
    localStorage.removeItem(snapshotSelectionKey)
  }
})

const validateWorkflow = () => {
  const nodes = workflowStore.nodes
  const edges = workflowStore.edges

  const outgoingMap = new Map<string, string[]>()
  const incomingMap = new Map<string, string[]>()

  edges.forEach(edge => {
    const outgoing = outgoingMap.get(edge.source) || []
    outgoing.push(edge.id)
    outgoingMap.set(edge.source, outgoing)

    const incoming = incomingMap.get(edge.target) || []
    incoming.push(edge.id)
    incomingMap.set(edge.target, incoming)
  })

  // 规则1：条件节点必须有 True/False 两条边
  for (const node of nodes) {
    if (node.type !== 'condition') continue
    const outgoingEdgeIds = outgoingMap.get(node.id) || []
    if (outgoingEdgeIds.length !== 2) {
      ElMessage.warning('条件节点必须有 True/False 两条边')
      return false
    }
    const labels = outgoingEdgeIds.map(id => {
      const edge = edges.find(item => item.id === id)
      return edge?.branchType || edge?.label
    })
    if (!(labels.includes('True') && labels.includes('False'))) {
      ElMessage.warning('条件节点必须包含 True/False 分支标签')
      return false
    }
  }

  // 规则2：触发节点必须只有 1 条出边
  for (const node of nodes) {
    if (node.type !== 'trigger') continue
    const outgoingCount = (outgoingMap.get(node.id) || []).length
    if (outgoingCount !== 1) {
      ElMessage.warning('触发节点必须只有 1 条出边')
      return false
    }
  }

  // 规则3：结束节点必须有 1 条入边
  for (const node of nodes) {
    if (node.type !== 'end') continue
    const incomingCount = (incomingMap.get(node.id) || []).length
    if (incomingCount !== 1) {
      ElMessage.warning('结束节点必须有 1 条入边')
      return false
    }
  }

  // 规则4：知识检索节点必须在 LLM 之前（即 LLM 的上游存在知识节点）
  const knowledgeNodes = nodes.filter(node => node.type === 'knowledge')
  const llmNodes = nodes.filter(node => node.type === 'llm')
  if (knowledgeNodes.length > 0 && llmNodes.length > 0) {
    // 构建反向邻接表，便于从 LLM 回溯上游
    const reverseAdj = new Map<string, string[]>()
    edges.forEach(edge => {
      const list = reverseAdj.get(edge.target) || []
      list.push(edge.source)
      reverseAdj.set(edge.target, list)
    })

    const knowledgeIds = new Set(knowledgeNodes.map(node => node.id))

    for (const llm of llmNodes) {
      const stack = [llm.id]
      const visited = new Set<string>()
      let found = false
      while (stack.length > 0) {
        const current = stack.pop() as string
        if (visited.has(current)) continue
        visited.add(current)
        const parents = reverseAdj.get(current) || []
        for (const parent of parents) {
          if (knowledgeIds.has(parent)) {
            found = true
            break
          }
          stack.push(parent)
        }
        if (found) break
      }
      if (!found) {
        ElMessage.warning('知识检索节点必须在 LLM 之前')
        return false
      }
    }
  }

  return true
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
      nodeClassCache.set(node.id, node.class || null)
      return {
        ...node,
        style: {
          ...node.style,
          border: '2px solid #38bdf8',
          borderRadius: '10px',
          boxShadow: '0 0 0 4px rgba(56, 189, 248, 0.25)',
          transition: 'box-shadow 0.3s ease, border 0.3s ease',
        },
        class: 'node-highlight',
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
        const cachedClass = nodeClassCache.get(node.id)
        nodeClassCache.delete(node.id)
        return {
          ...node,
          style: cached || undefined,
          class: cachedClass || undefined,
        }
      }
      return node
    })

    // 同步清理连线高亮
    restoreEdgeHighlight()
  }, 2000)
}

const restoreEdgeHighlight = () => {
  if (edgeHighlightTimer) {
    window.clearTimeout(edgeHighlightTimer)
    edgeHighlightTimer = undefined
  }
  if (!lastHighlightedEdgeId.value) return
  const edgeId = lastHighlightedEdgeId.value
  workflowStore.edges = workflowStore.edges.map(edge => {
    if (edge.id !== edgeId) return edge
    const cachedStyle = edgeStyleCache.get(edgeId)
    const cachedClass = edgeClassCache.get(edgeId)
    edgeStyleCache.delete(edgeId)
    edgeClassCache.delete(edgeId)
    return {
      ...edge,
      style: cachedStyle || undefined,
      class: cachedClass || undefined,
    }
  })
  lastHighlightedEdgeId.value = ''
}

const mergeClass = (base: any, add: string) => {
  const set = new Set(String(base || '').split(' ').filter(Boolean))
  set.add(add)
  return Array.from(set).join(' ')
}

const getGradientColor = (index: number, total: number) => {
  if (total <= 1) return '#38bdf8'
  const startHue = 200
  const endHue = 120
  const hue = startHue - ((startHue - endHue) * index) / (total - 1)
  return `hsl(${hue}, 70%, 45%)`
}

const removeClass = (base: any, remove: string) => {
  const set = new Set(String(base || '').split(' ').filter(Boolean))
  set.delete(remove)
  return Array.from(set).join(' ')
}

const addTrailEdge = (edgeId: string, orderIndex: number) => {
  replayEdges.value.add(edgeId)
  workflowStore.edges = workflowStore.edges.map(edge => {
    if (edge.id !== edgeId) return edge
    if (!trailStyleCache.has(edgeId)) {
      trailStyleCache.set(edgeId, edge.style || null)
    }
    return {
      ...edge,
      style: {
        ...edge.style,
        stroke: getGradientColor(orderIndex, replayTotal.value || 1),
      },
      class: mergeClass(edge.class, 'edge-trail'),
    }
  })
}

const applyCompareEdges = (edgeIds: string[]) => {
  workflowStore.edges = workflowStore.edges.map(edge => {
    if (!edgeIds.includes(edge.id)) return edge
    return {
      ...edge,
      class: mergeClass(edge.class, 'edge-compare'),
    }
  })
}

const clearTrail = () => {
  // 恢复轨迹连线的原始样式
  workflowStore.edges = workflowStore.edges.map(edge => {
    if (trailStyleCache.has(edge.id)) {
      const cached = trailStyleCache.get(edge.id)
      return {
        ...edge,
        style: cached || undefined,
        class: removeClass(edge.class, 'edge-trail'),
      }
    }
    return {
      ...edge,
      class: removeClass(edge.class, 'edge-trail'),
    }
  })

  replayEdges.value.clear()
  lastReplayEdges.value = []
  trailStyleCache.clear()
  persistSnapshots()
}

const saveSnapshot = () => {
  const edgeIds = Array.from(replayEdges.value)
  if (edgeIds.length === 0) {
    ElMessage.warning('当前没有可保存的轨迹')
    return
  }
  const id = `snapshot-${Date.now()}`
  const label = `快照 ${new Date().toLocaleTimeString()}`
  snapshots.value.unshift({ id, label, edgeIds })
  selectedSnapshotId.value = id
  persistSnapshots()
  localStorage.setItem(snapshotSelectionKey, id)
}

const snapshotOptions = computed(() => snapshots.value.map(item => ({
  label: item.label,
  value: item.id,
})))

const applySnapshotCompare = (snapshotId: string) => {
  workflowStore.edges = workflowStore.edges.map(edge => ({
    ...edge,
    class: removeClass(edge.class, 'edge-compare'),
  }))

  const snapshot = snapshots.value.find(item => item.id === snapshotId)
  if (!snapshot) return
  applyCompareEdges(snapshot.edgeIds)
}

const deleteSnapshot = async () => {
  if (!selectedSnapshotId.value) {
    ElMessage.warning('请选择要删除的快照')
    return
  }
  try {
    await ElMessageBox.confirm('确认删除当前快照吗？', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    snapshots.value = snapshots.value.filter(item => item.id !== selectedSnapshotId.value)
    selectedSnapshotId.value = ''
    persistSnapshots()
    localStorage.removeItem(snapshotSelectionKey)
    ElMessage.success('已删除快照')
  } catch {
    // 用户取消
  }
}

const renameSnapshot = () => {
  if (!selectedSnapshotId.value) {
    ElMessage.warning('请选择要重命名的快照')
    return
  }
  const target = snapshots.value.find(item => item.id === selectedSnapshotId.value)
  if (!target) return
  const nextName = window.prompt('请输入新的快照名称', target.label)
  if (!nextName || !nextName.trim()) return
  target.label = nextName.trim()
  snapshots.value = [...snapshots.value]
  persistSnapshots()
}

const clearSnapshots = async () => {
  if (snapshots.value.length === 0) {
    ElMessage.warning('暂无快照可清空')
    return
  }
  try {
    await ElMessageBox.confirm('确认清空所有快照吗？', '清空确认', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
    snapshots.value = []
    selectedSnapshotId.value = ''
    persistSnapshots()
    localStorage.removeItem(snapshotSelectionKey)
    ElMessage.success('已清空所有快照')
  } catch {
    // 用户取消
  }
}

const exportSnapshot = () => {
  if (!selectedSnapshotId.value) {
    ElMessage.warning('请选择要导出的快照')
    return
  }
  const snapshot = snapshots.value.find(item => item.id === selectedSnapshotId.value)
  if (!snapshot) return
  const filename = `${snapshot.label.replace(/\s+/g, '_')}.json`
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const handleImportSnapshot = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        const payloads = Array.isArray(data) ? data : [data]

        const validSnapshots = payloads.filter(item => {
          return item && typeof item.id === 'string' && Array.isArray(item.edgeIds)
        })

        if (validSnapshots.length === 0) {
          ElMessage.warning('未检测到有效的快照数据')
          return
        }

        const existingIds = new Set(snapshots.value.map(item => item.id))
        const merged = [...validSnapshots.filter(item => !existingIds.has(item.id)), ...snapshots.value]

        snapshots.value = merged.map(item => ({
          id: item.id,
          label: item.label || `快照 ${item.id.slice(-4)}`,
          edgeIds: item.edgeIds,
        }))

        persistSnapshots()
        ElMessage.success('快照导入成功')
      } catch {
        ElMessage.error('快照导入失败，请检查文件格式')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

// 快照持久化（本地缓存）
const snapshotKey = 'workflowReplaySnapshots'
const snapshotSelectionKey = 'workflowReplaySnapshotSelected'

const loadSnapshots = () => {
  try {
    const raw = localStorage.getItem(snapshotKey)
    if (raw) {
      snapshots.value = JSON.parse(raw)
    }
    const selected = localStorage.getItem(snapshotSelectionKey)
    if (selected) {
      selectedSnapshotId.value = selected
    }
  } catch {
    snapshots.value = []
  }
}

const persistSnapshots = () => {
  localStorage.setItem(snapshotKey, JSON.stringify(snapshots.value))
}

loadSnapshots()

const highlightEdgeByNodes = (sourceId: string | undefined, targetId: string | undefined) => {
  if (!sourceId || !targetId) return
  const edge = workflowStore.edges.find(item => item.source === sourceId && item.target === targetId)
  if (!edge) return

  // 清理上一次高亮
  restoreEdgeHighlight()

  edgeStyleCache.set(edge.id, edge.style || null)
  edgeClassCache.set(edge.id, edge.class || null)
  lastHighlightedEdgeId.value = edge.id

  workflowStore.edges = workflowStore.edges.map(item => {
    if (item.id !== edge.id) return item
    return {
      ...item,
      style: {
        ...item.style,
        strokeWidth: 3,
        filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.6))',
      },
      class: mergeClass(item.class, 'edge-highlight'),
    }
  })

  // 保持连线高亮一段时间
  edgeHighlightTimer = window.setTimeout(() => {
    restoreEdgeHighlight()
  }, 2000)

  return edge.id
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

const executionLogGroups = computed(() => {
  const logs = selectedExecution.value?.logs || []
  const groups: Array<{ title: string; items: string[]; nodeId?: string }> = []
  let currentGroup: { title: string; items: string[]; nodeId?: string } | null = null

  for (const line of logs) {
    if (line.includes('执行节点：')) {
      const nodeId = getNodeIdFromLog(line)
      if (currentGroup) {
        groups.push(currentGroup)
      }
      currentGroup = { title: line, items: [], nodeId: nodeId || undefined }
      continue
    }

    if (!currentGroup) {
      currentGroup = { title: '通用日志', items: [] }
    }
    currentGroup.items.push(line)
  }

  if (currentGroup) {
    groups.push(currentGroup)
  }

  return groups
})

const collapsedGroups = ref<Set<number>>(new Set())

const toggleGroup = (index: number) => {
  if (collapsedGroups.value.has(index)) {
    collapsedGroups.value.delete(index)
  } else {
    collapsedGroups.value.add(index)
  }
}

// 默认折叠策略：仅展开最近一组，其余折叠
watch(executionLogGroups, (groups) => {
  const next = new Set<number>()
  const lastIndex = groups.length - 1
  groups.forEach((_, index) => {
    if (index !== lastIndex) {
      next.add(index)
    }
  })
  collapsedGroups.value = next
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

const getNodeIdFromLog = (line: string) => {
  const match = line.match(/\(([^)]+)\)/)
  return match ? match[1] : ''
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
        :replaying="replaying"
        v-model:replaySpeed="replaySpeed"
        :replay-progress="replayProgress"
        :replay-total="replayTotal"
        v-model:preserveTrail="preserveTrail"
        v-model:compareLast="compareLast"
        :snapshot-options="snapshotOptions"
        v-model:selectedSnapshotId="selectedSnapshotId"
        @save="handleSaveWorkflow"
        @run="handleRunWorkflow"
        @clear="handleClear"
        @replay="startReplay"
        @stop-replay="stopReplay"
        @seek-replay="seekReplay"
        @clear-trail="clearTrail"
        @save-snapshot="saveSnapshot"
        @delete-snapshot="deleteSnapshot"
        @rename-snapshot="renameSnapshot"
        @clear-snapshots="clearSnapshots"
        @export-snapshot="exportSnapshot"
      />

      <div class="canvas" @dragover="onDragOver" @drop="onDrop">
        <VueFlow
          v-model:nodes="workflowStore.nodes"
          v-model:edges="workflowStore.edges"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
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
            <div
              v-for="(group, gIndex) in executionLogGroups"
              :key="gIndex"
              class="group"
            >
              <div class="group-header" @click="toggleGroup(gIndex)">
                <span class="group-title">{{ group.title }}</span>
                <span class="group-toggle">
                  {{ collapsedGroups.has(gIndex) ? '展开' : '折叠' }}
                </span>
              </div>
              <div v-if="!collapsedGroups.has(gIndex)">
                <div v-if="group.items.length === 0" class="log-item muted">无额外信息</div>
                <div
                  v-for="(line, index) in group.items"
                  :key="index"
                  class="log-item"
                  :class="{ clickable: getNodeIdFromLog(line) }"
                  @click="getNodeIdFromLog(line) && highlightNode(getNodeIdFromLog(line))"
                >
                  {{ line }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="actions">
          <el-button @click="handleCopyExecution">复制详情</el-button>
          <el-button type="primary" @click="handleDownloadLogs">下载日志</el-button>
          <el-button type="success" @click="startReplayFromExecution">回放该记录</el-button>
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

.group {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.group-title {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.group-toggle {
  font-size: 12px;
  color: #64748b;
}

.log-item {
  font-size: 12px;
  color: #334155;
}

.log-item.clickable {
  cursor: pointer;
  color: #0ea5e9;
}

.log-item.muted {
  color: #94a3b8;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@keyframes nodeBlink {
  0% {
    box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(56, 189, 248, 0.35);
  }
  100% {
    box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15);
  }
}

:deep(.node-highlight) {
  animation: nodeBlink 0.8s ease-in-out 2;
}
</style>
