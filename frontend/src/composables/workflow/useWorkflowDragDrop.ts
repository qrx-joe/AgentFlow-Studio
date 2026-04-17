import type { WorkflowNode, NodeType } from '@/types';

interface AddNodeCallback {
  (nodes: WorkflowNode[]): void;
}

export const useWorkflowDragDrop = (
  project: (pos: { x: number; y: number }) => { x: number; y: number },
  addNodes: AddNodeCallback,
) => {
  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    if (!event.dataTransfer) return;

    const nodeType = event.dataTransfer.getData('application/vueflow') as NodeType;
    if (!nodeType) return;

    // Find VueFlow container to get correct coordinates
    const target = event.currentTarget as HTMLElement;
    const vueFlowEl = target.querySelector('.vue-flow') as HTMLElement;
    if (!vueFlowEl) {
      console.warn('[DragDrop] VueFlow element not found');
      return;
    }

    const bounds = vueFlowEl.getBoundingClientRect();

    // Calculate position relative to VueFlow container
    const position = project({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    const id = `node-${Date.now()}`;

    // Create node with proper default data based on type
    const nodeDefaults: Record<string, any> = {
      trigger: { label: '开始' },
      end: { label: '结束' },
      llm: { label: '大模型', model: 'gpt-4o', systemPrompt: '' },
      knowledge: { label: '知识检索', knowledgeBaseId: '' },
      condition: { label: '条件判断', conditions: [] },
      code: { label: '代码执行', code: '' },
      http: { label: 'HTTP 请求', url: '', method: 'GET' },
    };

    const node: WorkflowNode = {
      id,
      type: nodeType,
      position,
      data: nodeDefaults[nodeType] || { label: '新节点' },
    };

    addNodes([node]);
  };

  return {
    onDragOver,
    onDrop,
  };
};
