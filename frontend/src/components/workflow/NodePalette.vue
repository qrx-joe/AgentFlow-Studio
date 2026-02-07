<script setup lang="ts">
// 节点面板：提供拖拽入口
const nodes = [
  { type: 'trigger', label: '触发节点' },
  { type: 'llm', label: 'LLM 节点' },
  { type: 'knowledge', label: '知识检索' },
  { type: 'condition', label: '条件分支' },
  { type: 'code', label: '代码节点' },
  { type: 'end', label: '结束节点' },
]

const onDragStart = (event: DragEvent, nodeType: string) => {
  if (!event.dataTransfer) return
  // 将节点类型写入 dataTransfer，供画布读取
  event.dataTransfer.setData('application/vueflow', nodeType)
  event.dataTransfer.effectAllowed = 'move'
}
</script>

<template>
  <div class="palette">
    <div class="title">节点面板</div>
    <div
      v-for="node in nodes"
      :key="node.type"
      class="palette-item"
      draggable="true"
      @dragstart="(e) => onDragStart(e, node.type)"
    >
      {{ node.label }}
    </div>
  </div>
</template>

<style scoped>
.palette {
  background: #ffffff;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 10px;
}

.palette-item {
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  margin-bottom: 8px;
  cursor: grab;
}
</style>
