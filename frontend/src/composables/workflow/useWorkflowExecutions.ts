import { computed, ref, watch } from 'vue'

export const useWorkflowExecutions = (workflowStore: any) => {
  const selectedExecution = ref<any>(null)
  const showExecutionDialog = ref(false)
  const executionFilterStatus = ref('')

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

  const formattedExecutionLogs = computed(() => {
    return selectedExecution.value?.logs?.length
      ? selectedExecution.value.logs.join('\n')
      : ''
  })

  const getNodeIdFromLog = (line: string) => {
    const match = line.match(/\(([^)]+)\)/)
    return match ? match[1] : ''
  }

  const executionLogGroups = computed(() => {
    const logs = selectedExecution.value?.logs || []
    const groups: Array<{ title: string; items: Array<{ text: string; nodeId?: string }> }> = []
    let currentGroup: { title: string; items: Array<{ text: string; nodeId?: string }> } | null = null

    for (const line of logs) {
      if (line.includes('执行节点：')) {
        if (currentGroup) {
          groups.push(currentGroup)
        }
        currentGroup = { title: line, items: [] }
        continue
      }

      if (!currentGroup) {
        currentGroup = { title: '通用日志', items: [] }
      }
      currentGroup.items.push({ text: line, nodeId: getNodeIdFromLog(line) || undefined })
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

  const filteredExecutions = computed(() => {
    if (!executionFilterStatus.value) return workflowStore.executions
    return workflowStore.executions.filter((item: any) => item.status === executionFilterStatus.value)
  })

  return {
    selectedExecution,
    showExecutionDialog,
    executionFilterStatus,
    handleSelectExecution,
    formattedExecutionInput,
    formattedExecutionOutput,
    formattedExecutionLogs,
    executionLogGroups,
    collapsedGroups,
    toggleGroup,
    handleCopyExecution,
    handleDownloadLogs,
    filteredExecutions,
    getNodeIdFromLog,
  }
}
