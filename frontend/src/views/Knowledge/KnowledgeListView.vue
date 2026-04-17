<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Search, EditPen, Delete } from '@element-plus/icons-vue'
import { useKnowledgeStore } from '@/stores/knowledge'

const router = useRouter()
const knowledgeStore = useKnowledgeStore()

const searchQuery = ref('')
const showCreateDialog = ref(false)
const newKbName = ref('')
const newKbDesc = ref('')
const newKbColor = ref('#0f172a')

const showEditDialog = ref(false)
const editKbId = ref('')
const editKbName = ref('')
const editKbDesc = ref('')
const editKbColor = ref('#0f172a')

const colorOptions = [
  '#64748b', '#10b981', '#8b5cf6', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#6366f1'
]

// 删除确认弹窗
const deleteDialogVisible = ref(false)
const deletingKb = ref<any>(null)
const deleteLoading = ref(false)

onMounted(() => {
  knowledgeStore.fetchKnowledgeBases()
})

const filteredKnowledgeBases = computed(() => {
  if (!searchQuery.value.trim()) return knowledgeStore.knowledgeBases
  const keyword = searchQuery.value.toLowerCase()
  return knowledgeStore.knowledgeBases.filter(kb =>
    kb.name.toLowerCase().includes(keyword) ||
    kb.description?.toLowerCase().includes(keyword)
  )
})

const handleCreate = async () => {
  if (!newKbName.value.trim()) {
    ElMessage.warning('请输入知识库名称')
    return
  }
  try {
    const kb = await knowledgeStore.createKnowledgeBase({
      name: newKbName.value.trim(),
      description: newKbDesc.value.trim() || undefined,
      color: newKbColor.value,
    })
    ElMessage.success('知识库创建成功')
    showCreateDialog.value = false
    newKbName.value = ''
    newKbDesc.value = ''
    newKbColor.value = '#0f172a'
    // 跳转到详情页
    router.push(`/knowledge/${kb.id}`)
  } catch (e) {
    console.error('[KnowledgeList] Create failed:', e)
    ElMessage.error('创建失败')
  }
}

const handleOpen = (id: string) => {
  router.push(`/knowledge/${id}`)
}

const handleDelete = (kb: any, event: Event) => {
  event.stopPropagation()
  deletingKb.value = kb
  deleteDialogVisible.value = true
}

const confirmDelete = async () => {
  if (!deletingKb.value) return
  deleteLoading.value = true
  try {
    await knowledgeStore.deleteKnowledgeBase(deletingKb.value.id)
    ElMessage.success('知识库已删除')
    deleteDialogVisible.value = false
  } catch {
    ElMessage.error('删除失败')
  } finally {
    deleteLoading.value = false
    deletingKb.value = null
  }
}

const openEditDialog = (kb: any, event: Event) => {
  event.stopPropagation()
  editKbId.value = kb.id
  editKbName.value = kb.name
  editKbDesc.value = kb.description || ''
  editKbColor.value = kb.color || '#64748b'
  showEditDialog.value = true
}

const handleEdit = async () => {
  if (!editKbName.value.trim()) {
    ElMessage.warning('请输入知识库名称')
    return
  }
  try {
    await knowledgeStore.updateKnowledgeBase(editKbId.value, {
      name: editKbName.value.trim(),
      description: editKbDesc.value.trim() || undefined,
      color: editKbColor.value,
    })
    ElMessage.success('知识库已更新')
    showEditDialog.value = false
  } catch (e) {
    console.error('[KnowledgeList] Update failed:', e)
    ElMessage.error('更新失败')
  }
}

const formatNumber = (num: number) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="knowledge-list-page">
    <!-- 头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          知识库
        </h1>
        <p class="page-desc">
          管理和组织您的知识文档，为 AI 应用提供上下文
        </p>
      </div>
      <div class="header-right">
        <el-input
          v-model="searchQuery"
          placeholder="搜索知识库..."
          :prefix-icon="Search"
          clearable
          class="search-input"
        />
        <el-button
          type="primary"
          :icon="Plus"
          @click="showCreateDialog = true"
        >
          创建知识库
        </el-button>
      </div>
    </div>

    <!-- 知识库卡片网格 -->
    <div
      v-loading="knowledgeStore.loadingBases"
      class="kb-grid"
    >
      <!-- 创建卡片 - 放在最前面 -->
      <div
        class="kb-card create-card"
        @click="showCreateDialog = true"
      >
        <div class="create-content">
          <el-icon class="create-icon">
            <Plus />
          </el-icon>
          <span class="create-text">创建知识库</span>
          <span class="create-hint">添加新的知识文档集合</span>
        </div>
      </div>

      <div
        v-for="kb in filteredKnowledgeBases"
        :key="kb.id"
        class="kb-card"
        @click="handleOpen(kb.id)"
      >
        <div class="card-header">
          <div
            class="kb-icon"
            :style="{ background: (kb.color || '#64748b') + '15', color: kb.color || '#64748b' }"
          >
            <span>{{ kb.name.slice(0, 1) }}</span>
          </div>
          <div
            class="card-actions"
            @click.stop
          >
            <el-button
              type="primary"
              link
              :icon="EditPen"
              @click="openEditDialog(kb, $event)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              link
              :icon="Delete"
              @click="handleDelete(kb, $event)"
            >
              删除
            </el-button>
          </div>
        </div>

        <div class="card-body">
          <h3 class="kb-name">
            {{ kb.name }}
          </h3>
          <p class="kb-desc">
            {{ kb.description || '暂无描述' }}
          </p>
        </div>

        <div class="card-footer">
          <div class="stat-item">
            <span class="stat-value">{{ kb.documentCount || 0 }}</span>
            <span class="stat-label">文档</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ formatNumber(kb.chunkCount || 0) }}</span>
            <span class="stat-label">分块</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ formatNumber(kb.totalChars || 0) }}</span>
            <span class="stat-label">字符</span>
          </div>
        </div>

        <div class="card-meta">
          <span>创建于 {{ formatDate(kb.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 创建对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="创建知识库"
      width="500px"
    >
      <el-form label-position="top">
        <el-form-item
          label="名称"
          required
        >
          <el-input
            v-model="newKbName"
            placeholder="给知识库起个名字"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="newKbDesc"
            type="textarea"
            placeholder="简单描述知识库的用途（可选）"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="颜色">
          <div class="color-picker">
            <div
              v-for="color in colorOptions"
              :key="color"
              class="color-option"
              :class="{ active: newKbColor === color }"
              :style="{ background: color }"
              @click="newKbColor = color"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleCreate"
        >
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑知识库"
      width="500px"
    >
      <el-form label-position="top">
        <el-form-item
          label="名称"
          required
        >
          <el-input
            v-model="editKbName"
            placeholder="给知识库起个名字"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editKbDesc"
            type="textarea"
            placeholder="简单描述知识库的用途（可选）"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="颜色">
          <div class="color-picker">
            <div
              v-for="color in colorOptions"
              :key="color"
              class="color-option"
              :class="{ active: editKbColor === color }"
              :style="{ background: color }"
              @click="editKbColor = color"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleEdit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 删除确认弹窗 -->
    <el-dialog
      v-model="deleteDialogVisible"
      width="420px"
      align-center
      :show-close="false"
      class="delete-dialog"
    >
      <div class="delete-content">
        <div class="delete-icon">
          <el-icon :size="32">
            <Delete />
          </el-icon>
        </div>
        <h3 class="delete-title">
          确认删除知识库？
        </h3>
        <p class="delete-desc">
          删除后，知识库「{{ deletingKb?.name }}」及其下的所有文档与数据将不可恢复
        </p>
      </div>
      <template #footer>
        <div class="delete-footer">
          <el-button
            size="large"
            @click="deleteDialogVisible = false"
          >
            取消
          </el-button>
          <el-button
            size="large"
            type="danger"
            :loading="deleteLoading"
            @click="confirmDelete"
          >
            确认删除
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.knowledge-list-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 40px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 40px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px 0;
  letter-spacing: -0.5px;
}

.page-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 260px;
}

/* 卡片网格 */
.kb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.kb-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.kb-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.08);
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.kb-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  transition: transform 0.2s;
}

.kb-card:hover .kb-icon {
  transform: scale(1.05);
}

.card-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.kb-card:hover .card-actions {
  opacity: 1;
}

.card-body {
  flex: 1;
  margin-bottom: 24px;
}

.kb-name {
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 8px;
  line-height: 1.4;
}

.kb-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 44px; /* Ensure 2 lines height consistency */
  line-height: 1.6;
}

.card-footer {
  display: flex;
  gap: 24px;
  padding: 16px 0;
  border-top: 1px dashed #e2e8f0; /* Dashed line for unified look */
  border-bottom: 1px dashed #e2e8f0;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* Left align stats */
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.stat-label {
  font-size: 12px;
  color: #94a3b8;
}

.card-meta {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

/* 创建卡片 */
.create-card {
  border: 2px dashed #e2e8f0;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 0; /* Clear padding for center alignment */
}

.create-card:hover {
  border-color: var(--color-primary-900);
  background: #f1f5f9;
  box-shadow: none;
  transform: none; /* No lift specific for create card if preferred, or keep it */
}

.create-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #64748b;
}

.create-icon {
  font-size: 32px;
  color: #94a3b8;
  transition: color 0.2s;
}

.create-card:hover .create-icon {
  color: var(--color-primary-900);
}

.create-text {
  font-size: 15px;
  font-weight: 600;
  transition: color 0.2s;
}

.create-hint {
  font-size: 12px;
  color: #94a3b8;
}

.create-card:hover .create-text {
  color: var(--color-primary-900);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h2 {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px;
}

.empty-state p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px;
}

/* 颜色选择器 */
.color-picker {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 6px; /* Squircle */
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.color-option:hover {
  transform: scale(1.15);
}

.color-option.active {
  border-color: #0f172a;
  box-shadow: 0 0 0 2px #fff;
  transform: scale(1.1);
}

/* 删除确认弹窗样式 */
:deep(.delete-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.delete-dialog .el-dialog__header) {
  display: none;
}

:deep(.delete-dialog .el-dialog__body) {
  padding: 40px 40px 24px;
}

:deep(.delete-dialog .el-dialog__footer) {
  padding: 0 40px 40px;
  border: none;
}

.delete-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.delete-icon {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: #ef4444;
}

.delete-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px;
}

.delete-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.delete-footer {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.delete-footer .el-button {
  min-width: 120px;
  border-radius: 8px;
  font-weight: 500;
}

.delete-footer .el-button--default {
  border-color: #e5e7eb;
  color: #374151;
}

.delete-footer .el-button--default:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}
</style>
