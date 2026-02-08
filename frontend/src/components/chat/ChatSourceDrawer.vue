<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  selectedSource: any
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'openDoc'): void
}>()
</script>

<template>
  <el-drawer
    :model-value="props.modelValue"
    title="来源详情"
    size="360px"
    @update:model-value="value => emit('update:modelValue', value)"
  >
    <div v-if="props.selectedSource" class="source-detail">
      <div class="detail-item">
        <div class="label">文档ID</div>
        <div class="value">{{ props.selectedSource.documentId || '-' }}</div>
      </div>
      <div class="detail-item">
        <div class="label">节点ID</div>
        <div class="value">{{ props.selectedSource.nodeId || '-' }}</div>
      </div>
      <div class="detail-item" v-if="props.selectedSource.content">
        <div class="label">内容片段</div>
        <pre class="snippet">{{ props.selectedSource.content }}</pre>
      </div>
      <div class="detail-actions">
        <el-button
          size="small"
          type="primary"
          :disabled="!props.selectedSource.documentId"
          @click="emit('openDoc')"
        >
          查看文档详情
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.source-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  gap: 10px;
}

.label {
  width: 70px;
  font-weight: 600;
  color: #334155;
}

.value {
  color: #0f172a;
}

.snippet {
  background: #0f172a;
  color: #e2e8f0;
  padding: 8px;
  border-radius: 8px;
  width: 100%;
  overflow: auto;
}

.detail-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
