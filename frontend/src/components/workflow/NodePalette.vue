<script setup lang="ts">
import { 
  Lightning, 
  Cpu, 
  Files, 
  Connection, 
  VideoPlay, 
  SwitchButton 
} from '@element-plus/icons-vue'

const emit = defineEmits(['drag-start'])

const onDragStart = (event: DragEvent, nodeType: string) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }
  emit('drag-start', event, nodeType)
}

const nodes = [
  { type: 'trigger', label: '触发器', icon: Lightning, color: '#f59e0b', desc: '工作流入口' },
  { type: 'llm', label: 'LLM', icon: Cpu, color: '#0ea5e9', desc: '大模型调用' },
  { type: 'knowledge', label: '知识库', icon: Files, color: '#10b981', desc: 'RAG 检索' },
  { type: 'condition', label: '判断', icon: Connection, color: '#8b5cf6', desc: '逻辑分支' },
  { type: 'code', label: '代码', icon: VideoPlay, color: '#6366f1', desc: 'JS 脚本' },
  { type: 'end', label: '结束', icon: SwitchButton, color: '#ef4444', desc: '输出结果' },
]
</script>

<template>
  <div class="palette-container glass-panel">
    <div class="palette-header">
      <span class="title">组件库</span>
      <span class="subtitle">拖拽添加节点</span>
    </div>
    <div class="node-grid">
      <div
        v-for="node in nodes"
        :key="node.type"
        class="node-item"
        :draggable="true"
        @dragstart="onDragStart($event, node.type)"
      >
        <div class="icon-box" :style="{ background: node.color + '15', color: node.color }">
          <el-icon><component :is="node.icon" /></el-icon>
        </div>
        <div class="node-info">
          <span class="node-label">{{ node.label }}</span>
          <!-- <span class="node-desc">{{ node.desc }}</span> -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.palette-container {
  position: absolute;
  left: 24px;
  top: 24px;
  width: 200px; /* Wider for grid/list hybrid, or smaller for strict icons */
  padding: 16px;
  border-radius: var(--radius-xl);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: rgba(255, 255, 255, 0.9);
}

.palette-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-neutral-900);
}

.subtitle {
  font-size: 11px;
  color: var(--color-neutral-500);
}

.node-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.node-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  background: #fff;
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-md);
  cursor: grab;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  gap: 8px;
}

.node-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-200);
}

.node-item:active {
  cursor: grabbing;
}

.icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.node-info {
  text-align: center;
}

.node-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-neutral-700);
}

.node-desc {
  font-size: 10px;
  color: var(--color-neutral-400);
  display: none; /* Hidden in grid view */
}
</style>
