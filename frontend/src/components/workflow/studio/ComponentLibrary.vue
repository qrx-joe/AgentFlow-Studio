<script setup lang="ts">
import { ref } from 'vue'
import {
  Lightning,
  Cpu,
  Files,
  Connection,
  VideoPlay,
  SwitchButton,
  Search,
  Link
} from '@element-plus/icons-vue'

const searchQuery = ref('')

const nodeGroups = [
  {
    title: '基础节点',
    items: [
      { type: 'trigger', label: '开始', icon: Lightning, color: '#f59e0b', desc: '流程入口' },
      { type: 'end', label: '结束', icon: SwitchButton, color: '#ef4444', desc: '流程出口' },
    ]
  },
  {
    title: 'AI 能力',
    items: [
      { type: 'llm', label: '大模型', icon: Cpu, color: '#0ea5e9', desc: '调用 LLM' },
      { type: 'knowledge', label: '知识检索', icon: Files, color: '#10b981', desc: 'RAG 查询' },
    ]
  },
  {
    title: '逻辑控制',
    items: [
      { type: 'condition', label: '条件判断', icon: Connection, color: '#8b5cf6', desc: 'If-Else' },
      { type: 'code', label: '代码执行', icon: VideoPlay, color: '#6366f1', desc: 'JS/Python' },
    ]
  },
  {
    title: '数据处理',
    items: [
      { type: 'http', label: 'HTTP 请求', icon: Link, color: '#667eea', desc: 'API 调用' },
    ]
  }
]

const emit = defineEmits(['drag-start'])

const onDragStart = (event: DragEvent, nodeType: string) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }
  emit('drag-start', event, nodeType)
}
</script>

<template>
  <div class="component-library">
    <div class="panel-header">
      <span class="panel-title">组件库</span>
    </div>
    
    <div class="search-box">
      <el-input 
        v-model="searchQuery" 
        placeholder="搜索组件..." 
        :prefix-icon="Search"
        size="small"
      />
    </div>

    <div class="library-content">
      <div v-for="group in nodeGroups" :key="group.title" class="group">
        <div class="group-title">{{ group.title }}</div>
        <div class="grid-container">
          <div
            v-for="node in group.items"
            :key="node.type"
            class="component-card"
            draggable="true"
            @dragstart="onDragStart($event, node.type)"
          >
            <div class="icon-wrapper" :style="{ background: node.color + '15', color: node.color }">
              <el-icon><component :is="node.icon" /></el-icon>
            </div>
            <div class="info">
              <span class="label">{{ node.label }}</span>
            </div>
            <div class="hover-tip">{{ node.desc }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.component-library {
  width: 100%;
  height: 100%;
  background: #ffffff;
  border-right: 1px solid var(--color-neutral-200);
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-neutral-100);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-neutral-900);
}

.search-box {
  padding: 12px 16px;
}

.library-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.group {
  margin-bottom: 20px;
}

.group-title {
  font-size: 12px;
  color: var(--color-neutral-500);
  margin-bottom: 8px;
  font-weight: 500;
}

.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.component-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  background: var(--color-neutral-50);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: grab;
  transition: all 0.2s;
  position: relative;
  gap: 6px;
}

.component-card:hover {
  background: #ffffff;
  border-color: var(--color-primary-200);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.component-card:active {
  cursor: grabbing;
}

.icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.label {
  font-size: 12px;
  color: var(--color-neutral-700);
  font-weight: 500;
}

.hover-tip {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-neutral-800);
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    white-space: nowrap;
}

.component-card:hover .hover-tip {
    opacity: 1;
    top: -28px;
}
</style>
