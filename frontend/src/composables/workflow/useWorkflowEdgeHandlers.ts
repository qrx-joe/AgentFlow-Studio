import { ElMessage } from 'element-plus';
export const useWorkflowEdgeHandlers = (workflowStore: any, addEdges: (edges: any[]) => void) => {
  const getEdgeStyle = (label?: string) => {
    if (label === 'True') {
      return { stroke: '#16a34a', strokeWidth: 2 };
    }
    if (label === 'False') {
      return { stroke: '#dc2626', strokeWidth: 2 };
    }
    return { stroke: '#94a3b8', strokeWidth: 2 };
  };
  const getEdgeLabelStyle = (label?: string) => {
    if (label === 'True') {
      return { fill: '#166534', fontWeight: 600 };
    }
    if (label === 'False') {
      return { fill: '#991b1b', fontWeight: 600 };
    }
    return { fill: '#64748b' };
  };
  const getEdgeLabelBgStyle = (label?: string) => {
    if (label === 'True') {
      return { fill: '#dcfce7', stroke: '#86efac', strokeWidth: 1, rx: 6, ry: 6 };
    }
    if (label === 'False') {
      return { fill: '#fee2e2', stroke: '#fecaca', strokeWidth: 1, rx: 6, ry: 6 };
    }
    return { fill: '#f1f5f9', stroke: '#e2e8f0', strokeWidth: 1, rx: 6, ry: 6 };
  };
  const handleConnect = (params: any) => {
    const sourceNode = workflowStore.nodes.find((node: any) => node.id === params.source);
    const targetNode = workflowStore.nodes.find((node: any) => node.id === params.target);

    if (params.source === params.target) {
      ElMessage.warning('不允许节点连接自身');
      return;
    }

    if (targetNode?.type === 'trigger') {
      ElMessage.warning('触发节点不能作为目标节点');
      return;
    }

    if (sourceNode?.type === 'end') {
      ElMessage.warning('结束节点不能再连接出边');
      return;
    }

    const duplicateEdge = workflowStore.edges.some(
      (edge: any) => edge.source === params.source && edge.target === params.target,
    );
    if (duplicateEdge) {
      ElMessage.warning('该连线已存在');
      return;
    }

    const createsCycle = (() => {
      const adjacency = new Map<string, string[]>();
      workflowStore.edges.forEach((edge: any) => {
        const list = adjacency.get(edge.source) || [];
        list.push(edge.target);
        adjacency.set(edge.source, list);
      });

      const visited = new Set<string>();
      const stack = [params.target];

      while (stack.length > 0) {
        const current = stack.pop() as string;
        if (current === params.source) {
          return true;
        }
        if (visited.has(current)) {
          continue;
        }
        visited.add(current);
        const next = adjacency.get(current) || [];
        stack.push(...next);
      }
      return false;
    })();

    if (createsCycle) {
      ElMessage.warning('该连线会导致循环依赖');
      return;
    }

    if (sourceNode && sourceNode.type !== 'condition') {
      const existingOutgoing = workflowStore.edges.filter(
        (edge: any) => edge.source === params.source,
      ).length;
      if (existingOutgoing >= 1) {
        ElMessage.warning('该节点已存在出边，请确认是否需要多分支');
      }
    }
    const outgoingCount = workflowStore.edges.filter(
      (edge: any) => edge.source === params.source,
    ).length;

    let label: string | undefined;
    if (sourceNode?.type === 'condition') {
      if (outgoingCount >= 2) {
        ElMessage.warning('条件节点最多只能有两条分支');
        return;
      }
      label = outgoingCount === 0 ? 'True' : 'False';
      const duplicateTarget = workflowStore.edges.some(
        (edge: any) => edge.source === params.source && edge.target === params.target,
      );
      if (duplicateTarget) {
        ElMessage.warning('条件节点分支已连接到该目标');
        return;
      }
    }

    if (sourceNode?.type === 'condition' && label) {
      if (label === 'True') {
        sourceNode.data = { ...sourceNode.data, trueEdgeId: params.id, trueTarget: params.target };
      } else if (label === 'False') {
        sourceNode.data = {
          ...sourceNode.data,
          falseEdgeId: params.id,
          falseTarget: params.target,
        };
      }
    }

    addEdges([
      {
        ...params,
        label,
        branchType: label,
        style: getEdgeStyle(label),
        labelStyle: getEdgeLabelStyle(label),
        labelBgStyle: getEdgeLabelBgStyle(label),
      },
    ]);
  };
  const handleEdgeClick = (_: any, edge: any) => {
    const sourceNode = workflowStore.nodes.find((node: any) => node.id === edge.source);
    if (sourceNode?.type !== 'condition') return;

    const nextLabel = edge.label === 'True' ? 'False' : 'True';
    workflowStore.edges = workflowStore.edges.map((item: any) => {
      if (item.id !== edge.id) return item;
      return {
        ...item,
        label: nextLabel,
        branchType: nextLabel,
        style: getEdgeStyle(nextLabel),
        labelStyle: getEdgeLabelStyle(nextLabel),
        labelBgStyle: getEdgeLabelBgStyle(nextLabel),
      };
    });

    const siblings = workflowStore.edges.filter(
      (item: any) => item.source === edge.source && item.id !== edge.id,
    );
    if (nextLabel === 'True') {
      sourceNode.data = {
        ...sourceNode.data,
        trueEdgeId: edge.id,
        trueTarget: edge.target,
        falseEdgeId: siblings[0]?.id,
        falseTarget: siblings[0]?.target,
      };
      workflowStore.edges = workflowStore.edges.map((item: any) => {
        if (item.source !== edge.source || item.id === edge.id) return item;
        return {
          ...item,
          label: 'False',
          branchType: 'False',
          style: getEdgeStyle('False'),
          labelStyle: getEdgeLabelStyle('False'),
          labelBgStyle: getEdgeLabelBgStyle('False'),
        };
      });
    } else {
      sourceNode.data = {
        ...sourceNode.data,
        falseEdgeId: edge.id,
        falseTarget: edge.target,
        trueEdgeId: siblings[0]?.id,
        trueTarget: siblings[0]?.target,
      };
      workflowStore.edges = workflowStore.edges.map((item: any) => {
        if (item.source !== edge.source || item.id === edge.id) return item;
        return {
          ...item,
          label: 'True',
          branchType: 'True',
          style: getEdgeStyle('True'),
          labelStyle: getEdgeLabelStyle('True'),
          labelBgStyle: getEdgeLabelBgStyle('True'),
        };
      });
    }
  };

  return {
    getEdgeStyle,
    getEdgeLabelStyle,
    getEdgeLabelBgStyle,
    handleConnect,
    handleEdgeClick,
  };
};
