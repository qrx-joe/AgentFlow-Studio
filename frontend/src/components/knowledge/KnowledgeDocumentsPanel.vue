<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

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

const searchKeyword = ref('')
const isDragging = ref(false)
const selectedDocs = ref<Set<string>>(new Set())
const showSettings = ref(false)

// 过滤文档
const filteredDocuments = computed(() => {
  if (!searchKeyword.value.trim()) return props.documents
  const keyword = searchKeyword.value.toLowerCase()
  return props.documents.filter(doc =>
    doc.filename?.toLowerCase().includes(keyword)
  )
})

// 统计信息
const stats = computed(() => ({
  total: props.documents.length,
  totalChunks: props.documents.reduce((sum, doc) => sum + (doc.metadata?.chunkCount || 0), 0),
  totalChars: props.documents.reduce((sum, doc) => sum + (doc.metadata?.charCount || 0), 0),
}))

// 文件上传
const handleUpload = async (options: { file: File }) => {
  try {
    await emit('upload', options.file)
  } catch (e) {
    console.error('[Upload] Error:', e)
  }
}

// 拖拽上传
const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleUpload({ file: files[0] })
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

// 批量操作

const toggleSelect = (id: string) => {
  if (selectedDocs.value.has(id)) {
    selectedDocs.value.delete(id)
  } else {
    selectedDocs.value.add(id)
  }
}

const handleBatchDelete = () => {
  if (selectedDocs.value.size === 0) {
    ElMessage.warning('请先选择要删除的文档')
    return
  }
  selectedDocs.value.forEach(id => emit('removeDoc', id))
  selectedDocs.value.clear()
}

// 格式化文件大小
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

// 格式化时间
const formatTime = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取文件图标
const getFileIcon = (fileType?: string) => {
  if (!fileType) return '📄'
  if (fileType.includes('pdf')) return '📕'
  if (fileType.includes('word') || fileType.includes('doc')) return '📘'
  if (fileType.includes('excel') || fileType.includes('sheet')) return '📗'
  if (fileType.includes('text') || fileType.includes('txt')) return '📝'
  if (fileType.includes('markdown') || fileType.includes('md')) return '📋'
  return '📄'
}
</script>

<template>
  <div class="knowledge-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-left">
        <h2 class="panel-title">📚 知识库</h2>
        <div class="stats">
          <span class="stat-item">{{ stats.total }} 个文档</span>
          <span class="stat-divider">·</span>
          <span class="stat-item">{{ stats.totalChunks }} 个分块</span>
          <span class="stat-divider">·</span>
          <span class="stat-item">{{ (stats.totalChars / 1000).toFixed(1) }}K 字符</span>
        </div>
      </div>
      <div class="header-right">
        <el-button
          :icon="showSettings ? 'ArrowUp' : 'Setting'"
          circle
          @click="showSettings = !showSettings"
        />
        <el-upload
          :http-request="handleUpload"
          :show-file-list="false"
          action=""
        >
          <el-button type="primary" :loading="props.uploading">
            <span class="btn-icon">📤</span>
            上传文档
          </el-button>
        </el-upload>
      </div>
    </div>

    <!-- 设置面板 -->
    <div v-if="showSettings" class="settings-panel">
      <div class="setting-item">
        <label class="setting-label">分块大小</label>
        <el-input-number
          :model-value="props.chunkSize"
          :min="100"
          :max="2000"
          :step="50"
          size="small"
          @update:model-value="(value: number | undefined) => emit('update:chunkSize', Number(value))"
        />
        <span class="setting-hint">字符数，建议 300-800</span>
      </div>
      <div class="setting-item">
        <label class="setting-label">重叠大小</label>
        <el-input-number
          :model-value="props.overlap"
          :min="0"
          :max="500"
          :step="10"
          size="small"
          @update:model-value="(value: number | undefined) => emit('update:overlap', Number(value))"
        />
        <span class="setting-hint">字符数，建议 10-20% 的分块大小</span>
      </div>
    </div>

    <!-- 搜索和批量操作 -->
    <div class="toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索文档名称..."
        clearable
        class="search-input"
      >
        <template #prefix>
          <span>🔍</span>
        </template>
      </el-input>
      <div class="batch-actions" v-if="selectedDocs.size > 0">
        <span class="selected-count">已选择 {{ selectedDocs.size }} 项</span>
        <el-button size="small" @click="selectedDocs.clear()">取消</el-button>
        <el-button size="small" type="danger" @click="handleBatchDelete">批量删除</el-button>
      </div>
    </div>

    <!-- 拖拽上传区域 -->
    <div
      v-if="filteredDocuments.length === 0 && !props.loading"
      class="upload-area"
      :class="{ dragging: isDragging }"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <div class="upload-icon">📁</div>
      <div class="upload-title">拖拽文件到这里上传</div>
      <div class="upload-hint">或点击上方"上传文档"按钮</div>
      <div class="upload-formats">支持 TXT, PDF, DOCX, MD 等格式</div>
    </div>

    <!-- 文档卡片列表 -->
    <div v-else class="documents-grid" v-loading="props.loading">
      <div
        v-for="doc in filteredDocuments"
        :key="doc.id"
        class="doc-card"
        :class="{ selected: selectedDocs.has(doc.id) }"
        @click="emit('openDoc', doc)"
      >
        <!-- 选择框 -->
        <div class="card-checkbox" @click.stop>
          <el-checkbox
            :model-value="selectedDocs.has(doc.id)"
            @change="toggleSelect(doc.id)"
          />
        </div>

        <!-- 文件图标 -->
        <div class="card-icon">
          {{ getFileIcon(doc.fileType) }}
        </div>

        <!-- 文件信息 -->
        <div class="card-content">
          <div class="card-title" :title="doc.filename">
            {{ doc.filename }}
          </div>
          <div class="card-meta">
            <span class="meta-item">
              <span class="meta-icon">📦</span>
              {{ doc.metadata?.chunkCount || 0 }} 分块
            </span>
            <span class="meta-item">
              <span class="meta-icon">📝</span>
              {{ formatFileSize(doc.metadata?.charCount) }}
            </span>
          </div>
          <div class="card-time">
            {{ formatTime(doc.createdAt) }}
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="card-actions" @click.stop>
          <el-button
            size="small"
            text
            @click="emit('openDoc', doc)"
          >
            详情
          </el-button>
          <el-button
            size="small"
            text
            type="danger"
            @click="emit('removeDoc', doc.id)"
          >
            删除
          </el-button>
        </div>

        <!-- 处理状态标签 -->
        <div class="card-status">
          <span class="status-badge success">✓ 已完成</span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredDocuments.length === 0 && searchKeyword && !props.loading" class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-text">未找到匹配的文档</div>
    </div>
  </div>
</template>

<style scoped>
.knowledge-panel {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

.stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}

.stat-item {
  white-space: nowrap;
}

.stat-divider {
  color: #d1d5db;
}

.header-right {
  display: flex;
  gap: 12px;
}

.btn-icon {
  margin-right: 4px;
}

/* 设置面板 */
.settings-panel {
  padding: 16px 24px;
  background: #f9fafb;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  gap: 24px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-label {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  min-width: 70px;
}

.setting-hint {
  font-size: 12px;
  color: #9ca3af;
}

/* 工具栏 */
.toolbar {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.search-input {
  max-width: 300px;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  font-size: 13px;
  color: #2563eb;
  font-weight: 500;
}

/* 拖拽上传区域 */
.upload-area {
  margin: 40px 24px;
  padding: 60px 20px;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
}

.upload-area:hover,
.upload-area.dragging {
  border-color: #2563eb;
  background: #eff6ff;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-title {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 12px;
}

.upload-formats {
  font-size: 12px;
  color: #9ca3af;
}

/* 文档卡片网格 */
.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 24px;
}

.doc-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.doc-card:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
  transform: translateY(-2px);
}

.doc-card.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.card-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
}

.card-icon {
  font-size: 40px;
  text-align: center;
  margin: 8px 0 16px;
}

.card-content {
  min-height: 80px;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.meta-icon {
  font-size: 14px;
}

.card-time {
  font-size: 11px;
  color: #9ca3af;
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.card-status {
  position: absolute;
  top: 12px;
  right: 12px;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.success {
  background: #d1fae5;
  color: #065f46;
}

/* 空状态 */
.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: #6b7280;
}

/* 响应式 */
@media (max-width: 768px) {
  .documents-grid {
    grid-template-columns: 1fr;
  }

  .settings-panel {
    flex-direction: column;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    max-width: 100%;
  }
}
</style>
