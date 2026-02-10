<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useVueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import { ElMessage } from 'element-plus'

// Layout Components
import StudioHeader from '@/components/workflow/studio/StudioHeader.vue'
import ComponentLibrary from '@/components/workflow/studio/ComponentLibrary.vue'
import PropertiesPanel from '@/components/workflow/studio/PropertiesPanel.vue'

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
const vueFlow = useVueFlow()
const { onConnect, addEdges, addNodes, project, removeNodes } = vueFlow

// Node & Edge Types
const nodeTypes = {
  trigger: TriggerNode,
  llm: LLMNode,
  knowledge: KnowledgeNode,
  condition: ConditionNode,
  code: CodeNode,
  end: EndNode,
}
const edgeTypes = {
  default: BranchEdge,
  step: BranchEdge,
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
        await workflowStore.executeWorkflow('Test Input')
        ElMessage.success('执行完成')
    } catch (e) {
        ElMessage.error('执行失败')
    } finally {
        workflowStore.executing = false
    }
}

const handlePublish = () => {
    ElMessage.success('应用已发布')
}

// Replay logic (simplified for layout demo, restore full logic later if needed)
const replaying = ref(false)
</script>

<template>
  <div class="studio-layout">
    <StudioHeader 
        :workflow-name="workflowStore.workflowName" 
        @run="handleRun"
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
  </div>
</template>

<style scoped>
.studio-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--color-neutral-50);
}

.studio-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.studio-left {
  width: 240px;
  flex-shrink: 0;
  z-index: 20;
}

.studio-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
}

.canvas-wrapper {
  flex: 1;
  background: #f0f4f8; /* slightly darker than standard white for canvas contrast */
  position: relative;
}

.studio-right {
  width: 300px;
  flex-shrink: 0;
  z-index: 20;
}
</style>
