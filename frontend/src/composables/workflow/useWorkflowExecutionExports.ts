import { ElMessage } from 'element-plus'

export const useWorkflowExecutionExports = (options: {
  workflowStore: any
  filteredExecutions: { value: any[] }
  selectedExecution: { value: any }
  getNodeIdFromLog: (line: string) => string
  buildNodeConfigSummary: (logs: string[]) => string[]
  exportReplayJson: (logs?: string[]) => void
  exportReplayTxt: (logs?: string[]) => void
}) => {
  const {
    workflowStore,
    filteredExecutions,
    selectedExecution,
    getNodeIdFromLog,
    buildNodeConfigSummary,
    exportReplayJson,
    exportReplayTxt,
  } = options

  const exportReplayScriptFromExecution = () => {
    if (!selectedExecution.value?.logs?.length) {
      ElMessage.warning('该执行记录没有可导出的日志')
      return
    }

    const logs = selectedExecution.value.logs
    const steps = logs
      .filter((line: string) => line.includes('执行节点：'))
      .map((line: string, index: number) => {
        const nodeId = getNodeIdFromLog(line)
        const node = workflowStore.nodes.find((item: any) => item.id === nodeId)
        const nodeName = node?.data?.label || node?.type || '未知节点'
        return `${index + 1}. 执行节点：${nodeName} (${nodeId})`
      })

    const summary = buildNodeConfigSummary(logs)

    const content = [
      '# 工作流回放脚本（执行记录）',
      '',
      `- 记录ID：${selectedExecution.value.id}`,
      `- 状态：${selectedExecution.value.status}`,
      `- 开始时间：${selectedExecution.value.startedAt}`,
      `- 结束时间：${selectedExecution.value.completedAt || '-'}`,
      '',
      '## 节点配置摘要',
      ...summary,
      '',
      '## 执行步骤',
      ...steps,
      '',
      '## 原始日志',
      '```',
      ...logs,
      '```',
    ].join('\n')

    const filename = `replay-execution-${selectedExecution.value.id}.md`
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportReplayJsonFromExecution = () => {
    if (!selectedExecution.value?.logs?.length) {
      ElMessage.warning('该执行记录没有可导出的日志')
      return
    }
    exportReplayJson(selectedExecution.value.logs)
  }

  const exportReplayTxtFromExecution = () => {
    if (!selectedExecution.value?.logs?.length) {
      ElMessage.warning('该执行记录没有可导出的日志')
      return
    }
    exportReplayTxt(selectedExecution.value.logs)
  }

  const exportExecutionHistory = (format: 'md' | 'json' | 'txt') => {
    const list = filteredExecutions.value
    if (!list.length) {
      ElMessage.warning('暂无可导出的执行记录')
      return
    }

    if (format === 'json') {
      const payload = list.map(item => ({
        id: item.id,
        status: item.status,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        errorMessage: item.errorMessage,
        logs: item.logs,
      }))
      const filename = `executions-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      return
    }

    if (format === 'txt') {
      const content = list.map(item => (
        `id=${item.id}\nstatus=${item.status}\nstartedAt=${item.startedAt}\ncompletedAt=${item.completedAt || ''}\n` +
        `error=${item.errorMessage || ''}\nlogs=\n${(item.logs || []).join('\n')}\n\n`
      )).join('\n')
      const filename = `executions-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      return
    }

    const md = [
      '# 执行记录导出',
      '',
      `- 导出时间：${new Date().toLocaleString()}`,
      `- 记录数量：${list.length}`,
      '',
      ...list.map((item, index) => {
        const header = `## ${index + 1}. ${item.id}`
        const meta = `- status: ${item.status}\n- startedAt: ${item.startedAt}\n- completedAt: ${item.completedAt || '-'}\n- error: ${item.errorMessage || '-'}`
        const logs = ['```', ...(item.logs || []), '```'].join('\n')
        return [header, meta, logs].join('\n')
      }),
    ].join('\n')

    const filename = `executions-${new Date().toISOString().replace(/[:.]/g, '-')}.md`
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return {
    exportReplayScriptFromExecution,
    exportReplayJsonFromExecution,
    exportReplayTxtFromExecution,
    exportExecutionHistory,
  }
}
