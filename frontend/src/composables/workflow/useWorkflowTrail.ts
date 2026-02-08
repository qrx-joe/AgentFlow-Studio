export const useWorkflowTrail = (options: {
  workflowStore: any
  replayTotal: { value: number }
}) => {
  const { workflowStore, replayTotal } = options
  const replayEdges = { value: new Set<string>() }
  const lastReplayEdges = { value: [] as string[] }
  const trailStyleCache = new Map<string, any>()

  const mergeClass = (base: any, add: string) => {
    const set = new Set(String(base || '').split(' ').filter(Boolean))
    set.add(add)
    return Array.from(set).join(' ')
  }

  const removeClass = (base: any, remove: string) => {
    const set = new Set(String(base || '').split(' ').filter(Boolean))
    set.delete(remove)
    return Array.from(set).join(' ')
  }

  const getGradientColor = (index: number, total: number) => {
    if (total <= 1) return '#38bdf8'
    const startHue = 200
    const endHue = 120
    const hue = startHue - ((startHue - endHue) * index) / (total - 1)
    return `hsl(${hue}, 70%, 45%)`
  }

  const addTrailEdge = (edgeId: string, orderIndex: number) => {
    replayEdges.value.add(edgeId)
    workflowStore.edges = workflowStore.edges.map((edge: any) => {
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
    workflowStore.edges = workflowStore.edges.map((edge: any) => {
      if (!edgeIds.includes(edge.id)) return edge
      return {
        ...edge,
        class: mergeClass(edge.class, 'edge-compare'),
      }
    })
  }

  const removeCompareEdges = () => {
    workflowStore.edges = workflowStore.edges.map((edge: any) => ({
      ...edge,
      class: removeClass(edge.class, 'edge-compare'),
    }))
  }

  const clearTrail = () => {
    workflowStore.edges = workflowStore.edges.map((edge: any) => {
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
  }

  return {
    replayEdges,
    lastReplayEdges,
    addTrailEdge,
    applyCompareEdges,
    removeCompareEdges,
    clearTrail,
  }
}
