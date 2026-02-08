import { ref } from 'vue'

export const useWorkflowHighlight = (options: {
  workflowStore: any
  setCenter?: any
  fitView?: any
  getViewport?: any
  setViewport?: any
}) => {
  const { workflowStore, setCenter, fitView, getViewport, setViewport } = options
  const viewportStack = ref<Array<{ x: number; y: number; zoom: number }>>([])
  const lastHighlightedEdgeId = ref('')
  const nodeStyleCache = new Map<string, any>()
  const nodeClassCache = new Map<string, any>()
  const edgeStyleCache = new Map<string, any>()
  const edgeClassCache = new Map<string, any>()
  let highlightTimer: number | undefined
  let edgeHighlightTimer: number | undefined

  const mergeClass = (base: any, add: string) => {
    const set = new Set(String(base || '').split(' ').filter(Boolean))
    set.add(add)
    return Array.from(set).join(' ')
  }

  const restoreEdgeHighlight = () => {
    if (edgeHighlightTimer) {
      window.clearTimeout(edgeHighlightTimer)
      edgeHighlightTimer = undefined
    }
    if (!lastHighlightedEdgeId.value) return
    const edgeId = lastHighlightedEdgeId.value
    workflowStore.edges = workflowStore.edges.map((edge: any) => {
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

  const highlightNode = (nodeId: string) => {
    if (getViewport) {
      viewportStack.value.push(getViewport())
    }

    workflowStore.nodes = workflowStore.nodes.map((node: any) => {
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

    const target = workflowStore.nodes.find((node: any) => node.id === nodeId)
    if (target && setCenter) {
      ;(setCenter as any)(target.position.x, target.position.y, { zoom: 1.2, duration: 400 })
    }

    if (highlightTimer) {
      window.clearTimeout(highlightTimer)
    }
    highlightTimer = window.setTimeout(() => {
      workflowStore.nodes = workflowStore.nodes.map((node: any) => {
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

      restoreEdgeHighlight()
    }, 2000)
  }

  const highlightEdgeByNodes = (sourceId: string | undefined, targetId: string | undefined) => {
    if (!sourceId || !targetId) return
    const edge = workflowStore.edges.find((item: any) => item.source === sourceId && item.target === targetId)
    if (!edge) return

    restoreEdgeHighlight()

    edgeStyleCache.set(edge.id, edge.style || null)
    edgeClassCache.set(edge.id, edge.class || null)
    lastHighlightedEdgeId.value = edge.id

    workflowStore.edges = workflowStore.edges.map((item: any) => {
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

    edgeHighlightTimer = window.setTimeout(() => {
      restoreEdgeHighlight()
    }, 2000)

    return edge.id
  }

  const handleRestoreViewport = () => {
    if (viewportStack.value.length > 0 && setViewport) {
      const last = viewportStack.value.pop()
      if (last) {
        setViewport(last, { duration: 300 })
        return
      }
      return
    }
    if (fitView) {
      ;(fitView as any)({ padding: 0.2, duration: 300 })
    }
  }

  return {
    highlightNode,
    restoreEdgeHighlight,
    highlightEdgeByNodes,
    handleRestoreViewport,
    lastHighlightedEdgeId,
  }
}
