import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useWorkflowSnapshotIO } from './useWorkflowSnapshotIO'

export const useWorkflowSnapshots = (options: {
  replayEdges: { value: Set<string> }
  applyCompareEdges: (edgeIds: string[]) => void
  removeCompareEdges: () => void
  replaySpeed: { value: number }
  preserveTrail: { value: boolean }
  compareLast: { value: boolean }
}) => {
  const { replayEdges, applyCompareEdges, removeCompareEdges, replaySpeed, preserveTrail, compareLast } = options
  const snapshots = ref<Array<{ id: string; label: string; edgeIds: string[]; meta?: any }>>([])
  const selectedSnapshotId = ref('')
  const applySnapshotMeta = ref(false)

  const snapshotKey = 'workflowReplaySnapshots'
  const snapshotSelectionKey = 'workflowReplaySnapshotSelected'
  const snapshotApplyKey = 'workflowReplaySnapshotApplyMeta'

  const snapshotOptions = computed(() => snapshots.value.map(item => ({ label: item.label, value: item.id })))

  const persistSnapshots = () => {
    localStorage.setItem(snapshotKey, JSON.stringify(snapshots.value))
  }

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
      const applyMeta = localStorage.getItem(snapshotApplyKey)
      if (applyMeta) {
        applySnapshotMeta.value = applyMeta === 'true'
      }
    } catch {
      snapshots.value = []
    }
  }

  const applySnapshotCompare = (snapshotId: string) => {
    removeCompareEdges()
    const snapshot = snapshots.value.find(item => item.id === snapshotId)
    if (!snapshot) return
    applyCompareEdges(snapshot.edgeIds)

    if (snapshot.meta) {
      if (typeof snapshot.meta.replaySpeed === 'number') {
        replaySpeed.value = snapshot.meta.replaySpeed
      }
      if (typeof snapshot.meta.preserveTrail === 'boolean') {
        preserveTrail.value = snapshot.meta.preserveTrail
      }
      if (typeof snapshot.meta.compareLast === 'boolean') {
        compareLast.value = snapshot.meta.compareLast
      }
    }
  }

  const saveSnapshot = () => {
    const edgeIds = Array.from(replayEdges.value)
    if (edgeIds.length === 0) {
      ElMessage.warning('当前没有可保存的轨迹')
      return
    }
    const id = `snapshot-${Date.now()}`
    const label = `快照 ${new Date().toLocaleTimeString()}`
    snapshots.value.unshift({
      id,
      label,
      edgeIds,
      meta: {
        replaySpeed: replaySpeed.value,
        preserveTrail: preserveTrail.value,
        compareLast: compareLast.value,
      },
    })
    selectedSnapshotId.value = id
    persistSnapshots()
    localStorage.setItem(snapshotSelectionKey, id)
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

  const { exportSnapshot, exportAllSnapshots, handleImportSnapshot } = useWorkflowSnapshotIO({
    snapshots,
    selectedSnapshotId,
    applySnapshotMeta,
    replaySpeed,
    preserveTrail,
    compareLast,
    persistSnapshots,
  })

  watch(selectedSnapshotId, (value) => {
    if (value) {
      applySnapshotCompare(value)
      localStorage.setItem(snapshotSelectionKey, value)
    } else {
      removeCompareEdges()
      localStorage.removeItem(snapshotSelectionKey)
    }
  })

  watch(applySnapshotMeta, (value) => {
    localStorage.setItem(snapshotApplyKey, String(value))
  })

  loadSnapshots()

  return {
    snapshots,
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
    persistSnapshots,
  }
}
