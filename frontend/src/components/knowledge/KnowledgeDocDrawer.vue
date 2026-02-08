<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  selectedDoc: any
  documentChunks: Array<{ id: string; content: string; chunkIndex: number }>
  chunkLoading: boolean
  chunkLimit: number
  focusedChunkId: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:chunkLimit', value: number): void
  (e: 'refresh'): void
}>()
</script>

<template>
  <el-drawer
    :model-value="props.modelValue"
    title="文档详情"
    size="420px"
    @update:model-value="value => emit('update:modelValue', value)"
  >
    <div v-if="props.selectedDoc" class="doc-detail">
      <div class="detail-row"><span class="label">文件名</span>{{ props.selectedDoc.filename }}</div>
      <div class="detail-row"><span class="label">类型</span>{{ props.selectedDoc.fileType || '-' }}</div>
      <div class="detail-row"><span class="label">大小</span>{{ props.selectedDoc.fileSize || '-' }}</div>

      <div class="detail-section">
        <div class="section-title">分块参数</div>
        <div class="detail-row"><span class="label">size</span>{{ props.selectedDoc.metadata?.chunkSize ?? '-' }}</div>
        <div class="detail-row"><span class="label">overlap</span>{{ props.selectedDoc.metadata?.overlap ?? '-' }}</div>
        <div class="detail-row"><span class="label">chunks</span>{{ props.selectedDoc.metadata?.chunkCount ?? '-' }}</div>
        <div class="detail-row"><span class="label">chars</span>{{ props.selectedDoc.metadata?.charCount ?? '-' }}</div>
        <div class="detail-row"><span class="label">dim</span>{{ props.selectedDoc.metadata?.embeddingDim ?? '-' }}</div>
        <div class="detail-row"><span class="label">chunkMs</span>{{ props.selectedDoc.metadata?.chunkMs ?? '-' }}</div>
        <div class="detail-row"><span class="label">embedMs</span>{{ props.selectedDoc.metadata?.embedMs ?? '-' }}</div>
        <div class="detail-row"><span class="label">processMs</span>{{ props.selectedDoc.metadata?.processMs ?? '-' }}</div>
      </div>

      <div class="detail-section">
        <div class="section-title">分块示例</div>
        <div class="chunk-config">
          <el-input-number
            :model-value="props.chunkLimit"
            :min="1"
            :max="20"
            :step="1"
            @update:model-value="value => emit('update:chunkLimit', Number(value))"
          />
          <el-button size="small" @click="emit('refresh')">刷新</el-button>
        </div>
        <div v-if="props.chunkLoading" class="loading">加载中...</div>
        <div v-else class="chunks">
          <div
            v-for="chunk in props.documentChunks"
            :key="chunk.id"
            :id="`chunk-${chunk.id}`"
            class="chunk-item"
            :class="{ focused: chunk.id === props.focusedChunkId }"
          >
            <div class="chunk-title">#{{ chunk.chunkIndex }}</div>
            <div class="chunk-content">{{ chunk.content }}</div>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.doc-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  font-size: 12px;
  color: #334155;
}

.label {
  display: inline-block;
  width: 90px;
  color: #64748b;
}

.detail-section {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
}

.section-title {
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 13px;
}

.chunk-config {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.chunks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chunk-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
}

.chunk-item.focused {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.chunk-title {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.chunk-content {
  font-size: 12px;
  color: #0f172a;
}

.loading {
  font-size: 12px;
  color: #64748b;
}
</style>
