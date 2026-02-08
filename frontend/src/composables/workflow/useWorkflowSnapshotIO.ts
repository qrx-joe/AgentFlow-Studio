import { ElMessage } from 'element-plus'

export const useWorkflowSnapshotIO = (options: {
  snapshots: { value: Array<{ id: string; label: string; edgeIds: string[]; meta?: any }> }
  selectedSnapshotId: { value: string }
  applySnapshotMeta: { value: boolean }
  replaySpeed: { value: number }
  preserveTrail: { value: boolean }
  compareLast: { value: boolean }
  persistSnapshots: () => void
}) => {
  const {
    snapshots,
    selectedSnapshotId,
    applySnapshotMeta,
    replaySpeed,
    preserveTrail,
    compareLast,
    persistSnapshots,
  } = options

  const exportSnapshot = () => {
    if (!selectedSnapshotId.value) {
      ElMessage.warning('请选择要导出的快照')
      return
    }
    const snapshot = snapshots.value.find(item => item.id === selectedSnapshotId.value)
    if (!snapshot) return
    const payload = {
      ...snapshot,
      meta: {
        replaySpeed: replaySpeed.value,
        preserveTrail: preserveTrail.value,
        compareLast: compareLast.value,
      },
    }
    const filename = `${snapshot.label.replace(/\s+/g, '_')}.json`
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportAllSnapshots = () => {
    if (snapshots.value.length === 0) {
      ElMessage.warning('暂无快照可导出')
      return
    }
    const filename = `snapshots-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const payload = snapshots.value.map(item => ({
      ...item,
      meta: item.meta || {
        replaySpeed: replaySpeed.value,
        preserveTrail: preserveTrail.value,
        compareLast: compareLast.value,
      },
    }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
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
            meta: item.meta,
          }))

          if (applySnapshotMeta.value && validSnapshots[0]?.id) {
            selectedSnapshotId.value = validSnapshots[0].id
          }

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

  return {
    exportSnapshot,
    exportAllSnapshots,
    handleImportSnapshot,
  }
}
