<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useVueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { ElMessage } from 'element-plus'

// Layout Components
import StudioHeader from '@/components/workflow/studio/StudioHeader.vue'
import ComponentLibrary from '@/components/workflow/studio/ComponentLibrary.vue'
import PropertiesPanel from '@/components/workflow/studio/PropertiesPanel.vue'
import DebugPanel from '@/components/workflow/DebugPanel.vue'

// Canvas
import WorkflowCanvasPanel from '@/components/workflow/panels/WorkflowCanvasPanel.vue'

// Logic
import { useWorkflowStore } from '@/stores/workflow'
import { useWorkflowDragDrop } from '@/composables/workflow/useWorkflowDragDrop'
import { useWorkflowEdgeHandlers } from '@/composables/workflow/useWorkflowEdgeHandlers'
// import { useWorkflowExecutions } from '@/composables/workflow/useWorkflowExecutions'

// Node Types
import BranchEdge from '@/components/workflow/BranchEdge.vue'
import TriggerNode from '@/components/nodes/TriggerNode.vue'
import LLMNode from '@/components/nodes/LLMNode.vue'
import KnowledgeNode from '@/components/nodes/KnowledgeNode.vue'
import ConditionNode from '@/components/nodes/ConditionNode.vue'
import CodeNode from '@/components/nodes/CodeNode.vue'
import EndNode from '@/components/nodes/EndNode.vue'
import HttpNode from '@/components/nodes/HttpNode.vue'

const route = useRoute()
const workflowStore = useWorkflowStore()

// Mock data loading based on ID
onMounted(() => {
    const id = route.params.id as string
    if (id) {
        if (id === 'new') {
            workflowStore.loadTemplate('hello-world')
        } else {
            // In real app, fetch execution/workflow data here
            // For now, just set a name
            const mockNames: Record<string, string> = {
                '1': '智能客服助手',
                '2': '文章摘要生成器',
                '3': '代码审计专家'
            }
            workflowStore.workflowName = mockNames[id] || '未命名应用'
            // Keep existing nodes if any, or load empty? 
            // For demo, we might want to load template for existing ones too if empty, 
            // but let's assume existing ones have data (not implemented in mock for now).
        }
    }
})
const FLOW_ID = 'workflow-canvas'
const vueFlow = useVueFlow({ id: FLOW_ID })
const { onConnect, addEdges, addNodes, project, removeNodes } = vueFlow

// Node & Edge Types
const nodeTypes = {
  trigger: TriggerNode,
  llm: LLMNode,
  knowledge: KnowledgeNode,
  condition: ConditionNode,
  code: CodeNode,
  end: EndNode,
  http: HttpNode,
}
const edgeTypes = {
  branch: BranchEdge,
}

// Logic Hooks
const { handleConnect } = useWorkflowEdgeHandlers(workflowStore, addEdges)
onConnect(handleConnect)
const { onDragOver, onDrop } = useWorkflowDragDrop(project, addNodes)

// Selection State
const selectedNodeId = ref('')
const selectedNode = computed(() => {
    return workflowStore.nodes.find(n => n.id === selectedNodeId.value)
})

// Event Handlers
const onNodeClick = (_: any, node: any) => {
    selectedNodeId.value = node.id
}

const onPaneClick = () => {
    selectedNodeId.value = ''
}

const handleUpdateNode = (id: string, data: any) => {
    const node = workflowStore.nodes.find(n => n.id === id)
    if (node) {
        node.data = { ...node.data, ...data }
    }
}

const handleDeleteNode = (id: string) => {
    removeNodes([id])
    selectedNodeId.value = ''
}

const handleRun = async () => {
    workflowStore.executing = true
    try {
        // 如果没有保存过，先自动保存
        if (!workflowStore.workflowId) {
            await workflowStore.saveWorkflow()
            ElMessage.info('已自动保存工作流')
        }
        await workflowStore.executeWorkflow('Test Input')
        ElMessage.success('执行完成')
    } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || '执行失败'
        ElMessage.error(msg)
        console.error('[Workflow Execute]', e)
    } finally {
        workflowStore.executing = false
    }
}

const handlePublish = () => {
    ElMessage.success('应用已发布')
}

// Replay logic (simplified for layout demo, restore full logic later if needed)
const replaying = ref(false)

// 调试面板
const debugPanelVisible = ref(false)

const handleShowDebug = () => {
  debugPanelVisible.value = true
}

const handleDebugRun = async (testData: any) => {
  console.log('[Debug] Running with test data:', testData)
  // 这里可以调用实际的执行逻辑
  await handleRun()
}
</script>

<template>
  <div class="studio-layout">
    <StudioHeader
        :workflow-name="workflowStore.workflowName"
        @run="handleShowDebug"
        @publish="handlePublish"
    />
    
    <div class="studio-body">
      <!-- Left: Component Library -->
      <aside class="studio-left">
        <ComponentLibrary @drag-start="() => {}" /> 
        <!-- Note: drag-start handles dataTransfer internally in ComponentLibrary, 
             but we need to ensure local onDragStart matches useWorkflowDragDrop expectations if tailored. 
             Actually ComponentLibrary sets dataTransfer, and onDrop reads it. 
        -->
      </aside>

      <!-- Center: Canvas -->
      <main class="studio-center">
        <!-- We reuse WorkflowCanvasPanel for the VueFlow wrapper, 
             but we might need to hide its internal Toolbar since we moved actions to Header 
        -->
        <div class="canvas-wrapper" @dragover="onDragOver" @drop="onDrop">
             <WorkflowCanvasPanel 
                :flow-id="FLOW_ID"
                v-model:nodes="workflowStore.nodes" 
                v-model:edges="workflowStore.edges"
                :node-types="nodeTypes"
                :edge-types="edgeTypes"
                :saving="false"
                :executing="workflowStore.executing"
                :replaying="replaying"
                :replay-speed="1000"
                :replay-progress="0"
                :replay-total="0"
                :preserve-trail="false"
                :compare-last="false"
                :snapshot-options="[]"
                :selected-snapshot-id="''"
                :apply-snapshot-meta="false"
                :on-drag-over="onDragOver"
                :on-drop="onDrop"
                @node-double-click="onNodeClick" 
                @pane-click="onPaneClick"
             />
             <!-- Note: WorkflowCanvasPanel currently has a Toolbar inside. 
                  In Phase 2 we should strip it or make it hideable via props. 
                  For now we live with duplicate controls or ignore it. 
             -->
        </div>
        
        <!-- Bottom: Optional Output Panel -->
        <!-- <div class="studio-bottom"></div> -->
      </main>

      <!-- Right: Properties -->
      <aside class="studio-right">
        <PropertiesPanel 
            :node="selectedNode" 
            @update="handleUpdateNode"
            @delete="handleDeleteNode"
        />
      </aside>
    </div>

    <!-- 调试面板 -->
    <DebugPanel
      v-model:visible="debugPanelVisible"
      @run="handleDebugRun"
    />
  </div>
</template>

<style scoped>
.studio-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #f5f7fa;
  overflow: hidden;
}

.studio-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  gap: 0;
}

.studio-left {
  width: 240px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
  z-index: 20;
}

.studio-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
  background: #f5f7fa;
}

.canvas-wrapper {
  flex: 1;
  background: #fafbfc;
  position: relative;
  overflow: hidden;
}

.studio-right {
  width: 360px;
  flex-shrink: 0;
  background: #ffffff;
  border-left: 1px solid #e4e7ed;
  overflow-y: auto;
  z-index: 20;
}

/* 滚动条样式优化 */
.studio-left::-webkit-scrollbar,
.studio-right::-webkit-scrollbar {
  width: 6px;
}

.studio-left::-webkit-scrollbar-thumb,
.studio-right::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.studio-left::-webkit-scrollbar-thumb:hover,
.studio-right::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}

.studio-left::-webkit-scrollbar-track,
.studio-right::-webkit-scrollbar-track {
  background: transparent;
}
</style>
