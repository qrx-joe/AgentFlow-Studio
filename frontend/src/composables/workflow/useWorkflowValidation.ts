import { ElMessage } from 'element-plus'

export const useWorkflowValidation = (workflowStore: any) => {
  const validateWorkflow = () => {
    const nodes = workflowStore.nodes
    const edges = workflowStore.edges

    const outgoingMap = new Map<string, string[]>()
    const incomingMap = new Map<string, string[]>()

    edges.forEach((edge: any) => {
      const outgoing = outgoingMap.get(edge.source) || []
      outgoing.push(edge.id)
      outgoingMap.set(edge.source, outgoing)

      const incoming = incomingMap.get(edge.target) || []
      incoming.push(edge.id)
      incomingMap.set(edge.target, incoming)
    })

    for (const node of nodes) {
      if (node.type !== 'condition') continue
      const outgoingEdgeIds = outgoingMap.get(node.id) || []
      if (outgoingEdgeIds.length !== 2) {
        ElMessage.warning('条件节点必须有 True/False 两条边')
        return false
      }
      const labels = outgoingEdgeIds.map(id => {
        const edge = edges.find((item: any) => item.id === id)
        return edge?.branchType || edge?.label
      })
      if (!(labels.includes('True') && labels.includes('False'))) {
        ElMessage.warning('条件节点必须包含 True/False 分支标签')
        return false
      }
    }

    for (const node of nodes) {
      if (node.type !== 'trigger') continue
      const outgoingCount = (outgoingMap.get(node.id) || []).length
      if (outgoingCount !== 1) {
        ElMessage.warning('触发节点必须只有 1 条出边')
        return false
      }
    }

    for (const node of nodes) {
      if (node.type !== 'end') continue
      const incomingCount = (incomingMap.get(node.id) || []).length
      if (incomingCount !== 1) {
        ElMessage.warning('结束节点必须有 1 条入边')
        return false
      }
    }

    const knowledgeNodes = nodes.filter((node: any) => node.type === 'knowledge')
    const llmNodes = nodes.filter((node: any) => node.type === 'llm')
    if (knowledgeNodes.length > 0 && llmNodes.length > 0) {
      const reverseAdj = new Map<string, string[]>()
      edges.forEach((edge: any) => {
        const list = reverseAdj.get(edge.target) || []
        list.push(edge.source)
        reverseAdj.set(edge.target, list)
      })

      const knowledgeIds = new Set(knowledgeNodes.map((node: any) => node.id))

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

  return { validateWorkflow }
}
