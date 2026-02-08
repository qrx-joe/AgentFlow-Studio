import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useWorkflowTrail } from './useWorkflowTrail'

export const useWorkflowReplay = (options: {
  workflowStore: any
  highlightNode: (nodeId: string) => void
  highlightEdgeByNodes: (sourceId: string | undefined, targetId: string | undefined) => string | undefined
  restoreEdgeHighlight: () => void
}) => {
  const { workflowStore, highlightNode, highlightEdgeByNodes, restoreEdgeHighlight } = options
  const replaying = ref(false)
  const replaySpeed = ref(1200)
  const replayProgress = ref(0)
  const replayTotal = ref(0)
  const replayNodes = ref<string[]>([])
  const preserveTrail = ref(true)
  const compareLast = ref(false)
  const trail = useWorkflowTrail({ workflowStore, replayTotal })
  const { replayEdges, lastReplayEdges, addTrailEdge, applyCompareEdges, removeCompareEdges, clearTrail } = trail
  let replayTimer: number | undefined

  const getNodeIdsFromLogs = (logs: string[]) => {
    return logs
      .filter(line => line.includes('执行节点：'))
      .map(line => getNodeIdFromLog(line))
      .filter(Boolean) as string[]
  }

  const getNodeIdFromLog = (line: string) => {
    const match = line.match(/\(([^)]+)\)/)
    return match ? match[1] : ''
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

    removeCompareEdges()
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

  const replaySpeedKey = 'workflowReplaySpeed'
  const cachedSpeed = Number(localStorage.getItem(replaySpeedKey))
  if (!Number.isNaN(cachedSpeed) && cachedSpeed > 0) {
    replaySpeed.value = cachedSpeed
  }

  watch(replaySpeed, (value) => {
    localStorage.setItem(replaySpeedKey, String(value))
    if (replaying.value) {
      stopReplay()
      startReplay()
    }
  })

  return {
    replaying,
    replaySpeed,
    replayProgress,
    replayTotal,
    replayNodes,
    preserveTrail,
    compareLast,
    replayEdges,
    lastReplayEdges,
    startReplay,
    stopReplay,
    seekReplay,
    clearTrail,
    applyCompareEdges,
    removeCompareEdges,
    getNodeIdsFromLogs,
    getNodeIdFromLog,
  }
}
