export const useWorkflowDragDrop = (project: (pos: { x: number; y: number }) => any, addNodes: any) => {
  const onDragOver = (event: DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

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

    addNodes([node])
  }

  return {
    onDragOver,
    onDrop,
  }
}
