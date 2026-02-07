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
      try {
        const response = await workflowApi.execute(this.workflowId, input)
        // 将后端返回的执行日志同步到前端面板
        if (Array.isArray(response.logs)) {
          this.executionLogs = response.logs
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
  },
})
