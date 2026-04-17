<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  selectedSource: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'openDoc'): void;
}>();
</script>

<template>
  <el-drawer
    :model-value="props.modelValue"
    title="📎 来源详情"
    size="380px"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div v-if="props.selectedSource" class="source-detail">
      <div class="detail-card">
        <div class="detail-item">
          <div class="label">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            文档ID
          </div>
          <div class="value">
            {{ props.selectedSource.documentId || '-' }}
          </div>
        </div>
        <div v-if="props.selectedSource.nodeId" class="detail-item">
          <div class="label">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              />
            </svg>
            节点ID
          </div>
          <div class="value">
            {{ props.selectedSource.nodeId }}
          </div>
        </div>
      </div>

      <div v-if="props.selectedSource.content" class="detail-content">
        <div class="content-label">内容片段</div>
        <pre class="snippet">{{ props.selectedSource.content }}</pre>
      </div>

      <div class="detail-actions">
        <el-button
          type="primary"
          round
          :disabled="!props.selectedSource.documentId"
          @click="emit('openDoc')"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            style="margin-right: 6px"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
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
  gap: 20px;
}

.detail-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.value {
  font-size: 13px;
  color: #0f172a;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  word-break: break-all;
}

.content-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.snippet {
  background: #0f172a;
  color: #e2e8f0;
  padding: 14px 16px;
  border-radius: 12px;
  width: 100%;
  overflow: auto;
  font-size: 13px;
  line-height: 1.6;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  margin: 0;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
