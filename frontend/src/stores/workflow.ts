import { defineStore } from 'pinia'
import type { WorkflowNode, WorkflowEdge, Workflow, WorkflowExecution } from '@/types'
import { workflowApi } from '@/api'

// 工作流状态管理：负责画布数据、保存与执行
export const useWorkflowStore = defineStore('workflow', {
  state: () => ({
    workflowId: '' as string,
    workflowName: '未命名工作流',
    nodes: [] as WorkflowNode[],
    edges: [] as WorkflowEdge[],
    saving: false,
    executing: false,
    executionLogs: [] as string[],
    executions: [] as WorkflowExecution[],
  }),

  actions: {
    // 设置画布数据
    setCanvas(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
      this.nodes = nodes
      this.edges = edges
    },

    // 追加执行日志，方便前端展示
    addLog(message: string) {
      const time = new Date().toLocaleTimeString()
      this.executionLogs.push(`[${time}] ${message}`)
    },

    clearLogs() {
      this.executionLogs = []
    },

    // 保存工作流（新建或更新）
    async saveWorkflow(): Promise<Workflow> {
      this.saving = true
      try {
        const payload = {
          id: this.workflowId || undefined,
          name: this.workflowName,
          nodes: this.nodes,
          edges: this.edges,
        }

        const response = this.workflowId
          ? await workflowApi.update(this.workflowId, payload)
          : await workflowApi.create(payload)

        this.workflowId = response.id
        return response
      } finally {
        this.saving = false
      }
    },

    // 加载工作流详情
    async loadWorkflow(id: string): Promise<Workflow> {
      const response = await workflowApi.get(id)
      this.workflowId = response.id
      this.workflowName = response.name
      this.nodes = response.nodes || []
      this.edges = response.edges || []
      return response
    },

    // 执行工作流
    async executeWorkflow(input?: string) {
      if (!this.workflowId) {
        throw new Error('请先保存工作流')
      }
      this.executing = true
      this.clearLogs()

      // Reset statuses
      this.nodes.forEach(node => {
        if (node.data) node.data.status = 'idle'
      })

      try {
        const response = await workflowApi.execute(this.workflowId, input)
        // 将后端返回的执行日志同步到前端面板
        if (Array.isArray(response.logs)) {
          this.executionLogs = response.logs
        }

        // Visualize Execution Steps
        if (response.steps && Array.isArray(response.steps)) {
          for (const step of response.steps) {
            const node = this.nodes.find(n => n.id === step.nodeId)
            if (node) {
              // Running state
              node.data = { ...node.data, status: 'running' }

              // Simulate processing time
              await new Promise(resolve => setTimeout(resolve, step.duration || 500))

              // Completed state
              node.data = { ...node.data, status: step.status || 'success', output: step.output }
            }
          }
        }

        await this.fetchExecutions()
        return response
      } finally {
        this.executing = false
      }
    },

    async fetchExecutions() {
      if (!this.workflowId) return
      const response = await workflowApi.listExecutions(this.workflowId)
      this.executions = response
    },

    // 加载预置模板
    loadTemplate(type: string) {
      if (type === 'hello-world') {
        this.nodes = [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 100, y: 200 },
            data: { label: '用户输入' }
          },
          {
            id: 'node-2',
            type: 'llm',
            position: { x: 400, y: 200 },
            data: {
              label: 'AI 回复',
              model: 'gpt-4o',
              systemPrompt: '你是一个乐于助人的 AI 助手。'
            }
          },
          {
            id: 'node-3',
            type: 'end',
            position: { x: 750, y: 200 },
            data: { label: '结束' }
          }
        ]
        this.edges = [
          { id: 'edge-1-2', source: 'node-1', target: 'node-2', sourceHandle: null, targetHandle: null },
          { id: 'edge-2-3', source: 'node-2', target: 'node-3', sourceHandle: null, targetHandle: null }
        ]
        this.workflowName = '新建 AI 应用'
        this.addLog('已加载 "Hello World" 模板')
      }
    }
  },
})
