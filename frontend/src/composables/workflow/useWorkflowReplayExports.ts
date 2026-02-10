import { ElMessage } from 'element-plus'

export const useWorkflowReplayExports = (options: {
  workflowStore: any
  getNodeIdFromLog: (line: string) => string
}) => {
  const { workflowStore, getNodeIdFromLog } = options

  const getNodeIdsFromLogs = (logs: string[]) => {
    return logs
      .filter(line => line.includes('执行节点：'))
      .map(line => getNodeIdFromLog(line))
      .filter(Boolean)
  }

  const buildNodeConfigSummary = (logs: string[]) => {
    const nodeIds = getNodeIdsFromLogs(logs)
    const uniqueNodeIds = Array.from(new Set(nodeIds))

    if (uniqueNodeIds.length === 0) {
      return ['- 无节点配置可展示']
    }

    return uniqueNodeIds.map((nodeId, index) => {
      const node = workflowStore.nodes.find((item: any) => item.id === nodeId)
      if (!node) {
        return `${index + 1}. ${nodeId}（未找到节点）`
      }

      const name = node.data?.label || node.type

      if (node.type === 'llm') {
        const model = node.data?.model || '未配置'
        const prompt = node.data?.prompt ? String(node.data.prompt) : '未配置'
        return `${index + 1}. LLM ${name} (${nodeId}) | model=${model} | prompt=${prompt}`
      }

      if (node.type === 'knowledge') {
        const topK = node.data?.topK ?? 3
        const scoreThreshold = node.data?.scoreThreshold ?? '未配置'
        const filters = node.data?.filters ? JSON.stringify(node.data.filters) : '未配置'
        return `${index + 1}. 知识检索 ${name} (${nodeId}) | topK=${topK} | scoreThreshold=${scoreThreshold} | filters=${filters}`
      }

      if (node.type === 'condition') {
        const variableKey = node.data?.variableKey || '未配置'
        const expectedValue = node.data?.expectedValue || '未配置'
        return `${index + 1}. 条件 ${name} (${nodeId}) | key=${variableKey} | expected=${expectedValue}`
      }

      if (node.type === 'code') {
        return `${index + 1}. 代码 ${name} (${nodeId})`
      }

      if (node.type === 'trigger') {
        return `${index + 1}. 触发 ${name} (${nodeId})`
      }

      if (node.type === 'end') {
        return `${index + 1}. 结束 ${name} (${nodeId})`
      }

      return `${index + 1}. ${name} (${nodeId})`
    })
  }

  const exportReplayScript = () => {
    const logs = workflowStore.executionLogs
    if (!logs.length) {
      ElMessage.warning('暂无可导出的回放日志')
      return
    }

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
      '# 工作流回放脚本',
      '',
      `- 导出时间：${new Date().toLocaleString()}`,
      `- 步骤数量：${steps.length}`,
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

    const filename = `replay-script-${new Date().toISOString().replace(/[:.]/g, '-')}.md`
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

  const exportReplayJson = (logs?: string[]) => {
    const sourceLogs = logs || workflowStore.executionLogs
    if (!sourceLogs.length) {
      ElMessage.warning('暂无可导出的回放日志')
      return
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      steps: getNodeIdsFromLogs(sourceLogs),
      logs: sourceLogs,
    }
    const filename = `replay-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
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

  const exportReplayTxt = (logs?: string[]) => {
    const sourceLogs = logs || workflowStore.executionLogs
    if (!sourceLogs.length) {
      ElMessage.warning('暂无可导出的回放日志')
      return
    }
    const content = sourceLogs.join('\n')
    const filename = `replay-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
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
    exportReplayScript,
    exportReplayJson,
    exportReplayTxt,
    buildNodeConfigSummary,
  }
}
