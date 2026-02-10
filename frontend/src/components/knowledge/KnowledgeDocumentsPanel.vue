<script setup lang="ts">
const props = defineProps<{
  documents: any[]
  loading: boolean
  uploading: boolean
  chunkSize: number
  overlap: number
}>()

const emit = defineEmits<{
  (e: 'update:chunkSize', value: number): void
  (e: 'update:overlap', value: number): void
  (e: 'upload', file: any): void
  (e: 'openDoc', doc: any): void
  (e: 'removeDoc', id: string): void
}>()

const handleUpload = async (file: any) => {
  await emit('upload', file)
  return false
}
</script>

<template>
  <div class="panel">
    <div class="title">文档管理</div>
    <el-upload :before-upload="handleUpload" :show-file-list="false">
      <el-button type="primary" :loading="props.uploading">上传文档</el-button>
    </el-upload>

    <div class="config">
      <el-input-number
        :model-value="props.chunkSize"
        :min="100"
        :max="2000"
        :step="50"
        @update:model-value="(value: number | undefined) => emit('update:chunkSize', Number(value))"
      />
      <span class="config-label">分块大小</span>
      <el-input-number
        :model-value="props.overlap"
        :min="0"
        :max="500"
        :step="10"
        @update:model-value="(value: number | undefined) => emit('update:overlap', Number(value))"
      />
      <span class="config-label">重叠</span>
    </div>

    <el-table :data="props.documents" style="width: 100%" v-loading="props.loading">
      <el-table-column prop="filename" label="文件名" />
      <el-table-column prop="fileType" label="类型" width="100" />
      <el-table-column label="分块参数" width="320">
        <template #default="scope">
          <el-tooltip placement="top" effect="dark">
            <template #content>
              <div class="meta-tooltip">
                <div>size: {{ scope.row.metadata?.chunkSize ?? '-' }}</div>
                <div>overlap: {{ scope.row.metadata?.overlap ?? '-' }}</div>
                <div>chunks: {{ scope.row.metadata?.chunkCount ?? '-' }}</div>
                <div>chars: {{ scope.row.metadata?.charCount ?? '-' }}</div>
                <div>dim: {{ scope.row.metadata?.embeddingDim ?? '-' }}</div>
                <div>chunkMs: {{ scope.row.metadata?.chunkMs ?? '-' }}</div>
                <div>embedMs: {{ scope.row.metadata?.embedMs ?? '-' }}</div>
                <div>processMs: {{ scope.row.metadata?.processMs ?? '-' }}</div>
              </div>
            </template>
            <div class="meta">
              <span class="meta-item">size: {{ scope.row.metadata?.chunkSize ?? '-' }}</span>
              <span class="meta-item">overlap: {{ scope.row.metadata?.overlap ?? '-' }}</span>
              <span class="meta-item">chunks: {{ scope.row.metadata?.chunkCount ?? '-' }}</span>
              <span class="meta-item">chars: {{ scope.row.metadata?.charCount ?? '-' }}</span>
            </div>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="上传时间" width="180" />
      <el-table-column label="操作" width="120">
        <template #default="scope">
          <el-button size="small" @click="emit('openDoc', scope.row)">详情</el-button>
          <el-button size="small" type="danger" @click="emit('removeDoc', scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.panel {
  background: #ffffff;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.title {
  font-weight: 600;
  margin-bottom: 12px;
}

.config {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
}

.config-label {
  font-size: 12px;
  color: #64748b;
  margin-right: 8px;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #64748b;
}

.meta-item {
  line-height: 1.2;
}

.meta-tooltip {
  font-size: 12px;
  line-height: 1.4;
}
</style>
