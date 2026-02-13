<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Setting, Search, Document, Delete, Edit } from '@element-plus/icons-vue'
import { useKnowledgeStore, type KnowledgeBaseSettings } from '@/stores/knowledge'
import KnowledgeDocumentsPanel from '@/components/knowledge/KnowledgeDocumentsPanel.vue'
import KnowledgeSearchPanel from '@/components/knowledge/KnowledgeSearchPanel.vue'
import KnowledgeResults from '@/components/knowledge/KnowledgeResults.vue'
import KnowledgeDocDrawer from '@/components/knowledge/KnowledgeDocDrawer.vue'

const route = useRoute()
const router = useRouter()
const knowledgeStore = useKnowledgeStore()

const activeTab = ref('documents')
const loading = ref(true)

// 检索参数
const searchQuery = ref('')
const topK = ref(5)
const scoreThreshold = ref(0.5)
const hybrid = ref(true)
const rerank = ref(false)
const vectorWeight = ref(1)
const keywordWeight = ref(0.5)
const keywordMode = ref<'bm25' | 'tsrank' | 'trgm'>('bm25')

// 分块参数
const chunkSize = ref(500)
const overlap = ref(50)

// 文档抽屉
const showDocDrawer = ref(false)
const selectedDoc = ref<any>(null)
const chunkLimit = ref(10)
const focusedChunkId = ref('')

// 编辑对话框
const showEditDialog = ref(false)
const editForm = ref({ name: '', description: '' })

// 设置对话框
const showSettingsDialog = ref(false)
const settingsForm = ref<KnowledgeBaseSettings | null>(null)

const kb = computed(() => knowledgeStore.currentKnowledgeBase)

onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    loading.value = true
    try {
      await knowledgeStore.fetchKnowledgeBase(id)
      await knowledgeStore.fetchDocuments(id)
      // 从知识库设置初始化检索参数
      if (kb.value?.settings?.retrieval) {
        const r = kb.value.settings.retrieval
        topK.value = r.topK || 5
        scoreThreshold.value = r.scoreThreshold || 0.5
        hybrid.value = r.mode === 'hybrid'
        rerank.value = r.rerank || false
        vectorWeight.value = r.vectorWeight || 1
        keywordWeight.value = r.keywordWeight || 0.5
      }
      if (kb.value?.settings?.chunk) {
        chunkSize.value = kb.value.settings.chunk.chunkSize || 500
        overlap.value = kb.value.settings.chunk.overlap || 50
      }
    } finally {
      loading.value = false
    }
  }
})

const handleBack = () => {
  router.push('/knowledge')
}

const handleUpload = async (file: File) => {
  if (!kb.value) return
  try {
    await knowledgeStore.uploadDocument(file, kb.value.id, {
      chunkSize: chunkSize.value,
      overlap: overlap.value,
    })
    ElMessage.success('上传成功')
  } catch (e: any) {
    console.error('[KnowledgeDetail] Upload failed:', e)
  }
}

const handleSearch = async () => {
  if (!searchQuery.value.trim()) return
  await knowledgeStore.search(searchQuery.value, topK.value, {
    scoreThreshold: scoreThreshold.value,
    hybrid: hybrid.value,
    rerank: rerank.value,
    vectorWeight: vectorWeight.value,
    keywordWeight: keywordWeight.value,
    keywordMode: keywordMode.value,
  })
}

const openDocDetail = async (doc: any) => {
  selectedDoc.value = doc
  showDocDrawer.value = true
  await knowledgeStore.fetchDocumentChunks(doc.id, chunkLimit.value)
}

const refreshChunks = async () => {
  if (!selectedDoc.value) return
  await knowledgeStore.fetchDocumentChunks(selectedDoc.value.id, chunkLimit.value)
}

const handleDeleteDoc = async (id: string) => {
  if (!kb.value) return
  await knowledgeStore.deleteDocument(id, kb.value.id)
}

const handleEdit = () => {
  if (!kb.value) return
  editForm.value = {
    name: kb.value.name,
    description: kb.value.description || '',
  }
  showEditDialog.value = true
}

const handleSaveEdit = async () => {
  if (!kb.value) return
  try {
    await knowledgeStore.updateKnowledgeBase(kb.value.id, editForm.value)
    ElMessage.success('更新成功')
    showEditDialog.value = false
  } catch (e) {
    ElMessage.error('更新失败')
  }
}

const handleDelete = async () => {
  if (!kb.value) return
  try {
    await ElMessageBox.confirm(
      `确定要删除知识库「${kb.value.name}」吗？该操作将删除所有文档，且不可恢复。`,
      '删除确认',
      { type: 'warning' }
    )
    await knowledgeStore.deleteKnowledgeBase(kb.value.id)
    ElMessage.success('知识库已删除')
    router.push('/knowledge')
  } catch {
    // 取消
  }
}

const handleOpenSettings = () => {
  if (!kb.value) return
  settingsForm.value = JSON.parse(JSON.stringify(kb.value.settings))
  showSettingsDialog.value = true
}

const handleSaveSettings = async () => {
  if (!kb.value || !settingsForm.value) return
  try {
    await knowledgeStore.updateKnowledgeBase(kb.value.id, {
      settings: settingsForm.value,
    })
    ElMessage.success('设置已保存')
    showSettingsDialog.value = false
    // 更新本地参数
    if (settingsForm.value.retrieval) {
      const r = settingsForm.value.retrieval
      topK.value = r.topK
      scoreThreshold.value = r.scoreThreshold
      hybrid.value = r.mode === 'hybrid'
      rerank.value = r.rerank
      vectorWeight.value = r.vectorWeight || 1
      keywordWeight.value = r.keywordWeight || 0.5
    }
    if (settingsForm.value.chunk) {
      chunkSize.value = settingsForm.value.chunk.chunkSize
      overlap.value = settingsForm.value.chunk.overlap
    }
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

const formatNumber = (num: number) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}
</script>

<template>
  <div class="knowledge-detail-page" v-loading="loading">
    <!-- 顶部导航 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" text @click="handleBack">返回</el-button>
        <div class="kb-title" v-if="kb">
          <div class="kb-icon" :style="{ background: (kb.color || '#3b82f6') + '15', color: kb.color || '#3b82f6' }">
            {{ kb.name.slice(0, 1) }}
          </div>
          <div class="kb-info">
            <h1 class="kb-name">{{ kb.name }}</h1>
            <p class="kb-desc">{{ kb.description || '暂无描述' }}</p>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-button :icon="Edit" @click="handleEdit">编辑</el-button>
        <el-button :icon="Setting" @click="handleOpenSettings">设置</el-button>
        <el-button :icon="Delete" type="danger" plain @click="handleDelete">删除</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row" v-if="kb">
      <div class="stat-card">
        <div class="stat-value">{{ kb.documentCount || 0 }}</div>
        <div class="stat-label">文档数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(kb.chunkCount || 0) }}</div>
        <div class="stat-label">分块数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(kb.totalChars || 0) }}</div>
        <div class="stat-label">总字符</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ kb.settings?.retrieval?.mode || 'hybrid' }}</div>
        <div class="stat-label">检索模式</div>
      </div>
    </div>

    <!-- Tab 导航 -->
    <div class="tab-nav">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'documents' }"
        @click="activeTab = 'documents'"
      >
        <el-icon><Document /></el-icon>
        文档
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'retrieval' }"
        @click="activeTab = 'retrieval'"
      >
        <el-icon><Search /></el-icon>
        检索测试
      </button>
    </div>

    <!-- Tab 内容 -->
    <div class="tab-content">
      <!-- 文档管理 -->
      <div v-show="activeTab === 'documents'" class="content-panel">
        <KnowledgeDocumentsPanel
          :documents="knowledgeStore.documents"
          :loading="knowledgeStore.loading"
          :uploading="knowledgeStore.uploading"
          v-model:chunkSize="chunkSize"
          v-model:overlap="overlap"
          @upload="handleUpload"
          @openDoc="openDocDetail"
          @removeDoc="handleDeleteDoc"
        />
      </div>

      <!-- 检索测试 -->
      <div v-show="activeTab === 'retrieval'" class="content-panel">
        <div class="panel-card">
          <KnowledgeSearchPanel
            v-model:searchQuery="searchQuery"
            v-model:topK="topK"
            v-model:scoreThreshold="scoreThreshold"
            v-model:hybrid="hybrid"
            v-model:rerank="rerank"
            v-model:vectorWeight="vectorWeight"
            v-model:keywordWeight="keywordWeight"
            v-model:keywordMode="keywordMode"
            :searching="knowledgeStore.searching"
            @search="handleSearch"
          />
        </div>

        <div class="panel-card" v-if="knowledgeStore.searchResults.length > 0">
          <KnowledgeResults
            :search-results="knowledgeStore.searchResults"
            :search-stats="knowledgeStore.searchStats"
            :search-query="searchQuery"
            :score-threshold="scoreThreshold"
            :hybrid="hybrid"
            :rerank="rerank"
            :keyword-mode="keywordMode"
            :vector-weight="vectorWeight"
            :keyword-weight="keywordWeight"
          />
        </div>
      </div>
    </div>

    <!-- 文档详情抽屉 -->
    <KnowledgeDocDrawer
      v-model="showDocDrawer"
      v-model:chunkLimit="chunkLimit"
      :selected-doc="selectedDoc"
      :document-chunks="knowledgeStore.documentChunks"
      :chunk-loading="knowledgeStore.chunkLoading"
      :focused-chunk-id="focusedChunkId"
      @refresh="refreshChunks"
    />

    <!-- 编辑对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑知识库" width="480px">
      <el-form label-position="top">
        <el-form-item label="名称" required>
          <el-input v-model="editForm.name" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 设置对话框 -->
    <el-dialog v-model="showSettingsDialog" title="知识库设置" width="560px">
      <el-form v-if="settingsForm" label-position="top">
        <h4 class="settings-section-title">分块设置</h4>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分块大小">
              <el-input-number
                v-model="settingsForm.chunk.chunkSize"
                :min="100"
                :max="2000"
                :step="100"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="重叠字符">
              <el-input-number
                v-model="settingsForm.chunk.overlap"
                :min="0"
                :max="500"
                :step="10"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <h4 class="settings-section-title">检索设置</h4>
        <el-form-item label="检索模式">
          <el-radio-group v-model="settingsForm.retrieval.mode">
            <el-radio value="vector">向量检索</el-radio>
            <el-radio value="fulltext">全文检索</el-radio>
            <el-radio value="hybrid">混合检索</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="返回数量 (Top K)">
              <el-input-number v-model="settingsForm.retrieval.topK" :min="1" :max="20" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分数阈值">
              <el-input-number
                v-model="settingsForm.retrieval.scoreThreshold"
                :min="0"
                :max="1"
                :step="0.1"
                :precision="2"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="重排序">
          <el-switch v-model="settingsForm.retrieval.rerank" />
          <span class="setting-hint">使用 Rerank 模型对结果重新排序</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSettingsDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.knowledge-detail-page {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.kb-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.kb-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
}

.kb-info {
  display: flex;
  flex-direction: column;
}

.kb-name {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.kb-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 8px;
}

/* 统计卡片 */
.stats-row {
  display: flex;
  gap: 16px;
  padding: 20px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.stat-card {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
}

/* Tab 导航 */
.tab-nav {
  display: flex;
  gap: 4px;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--color-primary-900);
}

.tab-btn.active {
  color: var(--color-primary-900);
  border-bottom-color: var(--color-primary-900);
}

/* Tab 内容 */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.content-panel {
  max-width: 1200px;
  margin: 0 auto;
}

.panel-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

/* 设置对话框 */
.settings-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 20px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.settings-section-title:first-child {
  margin-top: 0;
}

.setting-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-left: 8px;
}
</style>
