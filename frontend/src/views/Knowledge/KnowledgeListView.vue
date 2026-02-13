<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, MoreFilled } from '@element-plus/icons-vue'
import { useKnowledgeStore } from '@/stores/knowledge'

const router = useRouter()
const knowledgeStore = useKnowledgeStore()

const searchQuery = ref('')
const showCreateDialog = ref(false)
const newKbName = ref('')
const newKbDesc = ref('')
const newKbColor = ref('#3b82f6')

const colorOptions = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#6366f1'
]

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
    newKbColor.value = '#3b82f6'
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

const handleDelete = async (kb: any, event: Event) => {
  event.stopPropagation()
  try {
    await ElMessageBox.confirm(
      `确定要删除知识库「${kb.name}」吗？该操作将删除知识库下的所有文档，且不可恢复。`,
      '删除确认',
      { type: 'warning' }
    )
    await knowledgeStore.deleteKnowledgeBase(kb.id)
    ElMessage.success('知识库已删除')
  } catch {
    // 用户取消
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
        <h1 class="page-title">知识库</h1>
        <p class="page-desc">管理和组织您的知识文档，为 AI 应用提供上下文</p>
      </div>
      <div class="header-right">
        <el-input
          v-model="searchQuery"
          placeholder="搜索知识库..."
          :prefix-icon="Search"
          clearable
          class="search-input"
        />
        <el-button type="primary" :icon="Plus" @click="showCreateDialog = true">
          创建知识库
        </el-button>
      </div>
    </div>

    <!-- 知识库卡片网格 -->
    <div class="kb-grid" v-if="filteredKnowledgeBases.length > 0">
      <div
        v-for="kb in filteredKnowledgeBases"
        :key="kb.id"
        class="kb-card"
        @click="handleOpen(kb.id)"
      >
        <div class="card-header">
          <div class="kb-icon" :style="{ background: (kb.color || '#3b82f6') + '15', color: kb.color || '#3b82f6' }">
            <span>{{ kb.name.slice(0, 1) }}</span>
          </div>
          <el-dropdown trigger="click" @click.stop>
            <el-icon class="more-btn"><MoreFilled /></el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleOpen(kb.id)">打开</el-dropdown-item>
                <el-dropdown-item divided @click="handleDelete(kb, $event)">
                  <span style="color: #ef4444;">删除</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <div class="card-body">
          <h3 class="kb-name">{{ kb.name }}</h3>
          <p class="kb-desc">{{ kb.description || '暂无描述' }}</p>
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

      <!-- 创建卡片 -->
      <div class="kb-card create-card" @click="showCreateDialog = true">
        <div class="create-content">
          <el-icon class="create-icon"><Plus /></el-icon>
          <span class="create-text">创建知识库</span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📚</div>
      <h2>还没有知识库</h2>
      <p>创建您的第一个知识库，开始构建 AI 的知识基础</p>
      <el-button type="primary" size="large" :icon="Plus" @click="showCreateDialog = true">
        创建知识库
      </el-button>
    </div>

    <!-- 创建对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建知识库" width="500px">
      <el-form label-position="top">
        <el-form-item label="名称" required>
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
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.knowledge-list-page {
  padding: 24px 32px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
}

.page-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 240px;
}

/* 卡片网格 */
.kb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.kb-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.kb-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.kb-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
}

.more-btn {
  padding: 4px;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.more-btn:hover {
  color: #6b7280;
  background: #f3f4f6;
}

.card-body {
  margin-bottom: 16px;
}

.kb-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px;
}

.kb-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}

.card-footer {
  display: flex;
  gap: 24px;
  padding: 12px 0;
  border-top: 1px solid #f3f4f6;
  border-bottom: 1px solid #f3f4f6;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.stat-label {
  font-size: 12px;
  color: #9ca3af;
}

.card-meta {
  font-size: 12px;
  color: #9ca3af;
}

/* 创建卡片 */
.create-card {
  border: 2px dashed #e5e7eb;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
}

.create-card:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.create-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #6b7280;
}

.create-icon {
  font-size: 32px;
  color: #9ca3af;
}

.create-card:hover .create-icon {
  color: #3b82f6;
}

.create-text {
  font-size: 14px;
  font-weight: 500;
}

.create-card:hover .create-text {
  color: #3b82f6;
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
  gap: 8px;
}

.color-option {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: #111827;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px currentColor;
}
</style>
