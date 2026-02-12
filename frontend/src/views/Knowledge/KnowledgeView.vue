<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useKnowledgeStore } from '@/stores/knowledge'
import KnowledgeDocumentsPanel from '@/components/knowledge/KnowledgeDocumentsPanel.vue'
import KnowledgeSearchPanel from '@/components/knowledge/KnowledgeSearchPanel.vue'
import KnowledgeResults from '@/components/knowledge/KnowledgeResults.vue'
import KnowledgeDocDrawer from '@/components/knowledge/KnowledgeDocDrawer.vue'
import KnowledgeEvalPanel from '@/components/knowledge/KnowledgeEvalPanel.vue'

const knowledgeStore = useKnowledgeStore()
const searchQuery = ref('')
const topK = ref(5)
const scoreThreshold = ref(0.5)
const hybrid = ref(true)
const rerank = ref(false)
const vectorWeight = ref(1)
const keywordWeight = ref(0.5)
const keywordMode = ref<'bm25' | 'tsrank' | 'trgm'>('bm25')
const chunkSize = ref(500)
const overlap = ref(50)
const showDocDrawer = ref(false)
const selectedDoc = ref<any>(null)
const chunkLimit = ref(10)
const focusKey = 'knowledgeDocFocus'
const focusSnippet = ref('')
const focusedChunkId = ref('')
const activeTab = ref<'documents' | 'search' | 'eval'>('documents')

onMounted(() => {
  knowledgeStore.fetchDocuments().then(() => {
    focusFromStorage()
  })
})

const handleUpload = async (file: File) => {
  try {
    await knowledgeStore.uploadDocument(file, {
      chunkSize: chunkSize.value,
      overlap: overlap.value,
    })
    ElMessage.success('上传成功')
  } catch (e: any) {
    console.error('[KnowledgeView] Upload failed:', e)
  }
}

const handleSearch = async () => {
  if (!searchQuery.value.trim()) return
  activeTab.value = 'search'
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
  await highlightChunk()
}

const openDocDetailById = async (docId: string) => {
  const doc = knowledgeStore.documents.find(item => item.id === docId)
  if (doc) {
    await openDocDetail(doc)
  }
}

const refreshChunks = async () => {
  if (!selectedDoc.value) return
  await knowledgeStore.fetchDocumentChunks(selectedDoc.value.id, chunkLimit.value)
  await highlightChunk()
}

const focusFromStorage = async () => {
  const raw = localStorage.getItem(focusKey)
  if (!raw) return
  localStorage.removeItem(focusKey)
  try {
    const payload = JSON.parse(raw)
    focusSnippet.value = String(payload?.snippet || '')
    await nextTick()
    await openDocDetailById(payload?.docId)
  } catch {
    // 忽略非法数据
  }
}

const highlightChunk = async () => {
  if (!focusSnippet.value) return
  const target = knowledgeStore.documentChunks.find(chunk =>
    String(chunk.content || '').includes(focusSnippet.value)
  )
  if (!target) return
  focusedChunkId.value = target.id
  await nextTick()
  const el = document.getElementById(`chunk-${target.id}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}
</script>

<template>
  <div class="knowledge-page">
    <!-- 侧边栏导航 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h1 class="sidebar-title">📚 知识库</h1>
      </div>

      <div class="sidebar-nav">
        <button
          class="nav-item"
          :class="{ active: activeTab === 'documents' }"
          @click="activeTab = 'documents'"
        >
          <span class="nav-icon">📁</span>
          <span class="nav-label">文档管理</span>
          <span class="nav-badge">{{ knowledgeStore.documents.length }}</span>
        </button>

        <button
          class="nav-item"
          :class="{ active: activeTab === 'search' }"
          @click="activeTab = 'search'"
        >
          <span class="nav-icon">🔍</span>
          <span class="nav-label">检索测试</span>
        </button>

        <button
          class="nav-item"
          :class="{ active: activeTab === 'eval' }"
          @click="activeTab = 'eval'"
        >
          <span class="nav-icon">📊</span>
          <span class="nav-label">效果评估</span>
        </button>
      </div>

      <div class="sidebar-footer">
        <div class="stats-card">
          <div class="stat-row">
            <span class="stat-label">总文档</span>
            <span class="stat-value">{{ knowledgeStore.documents.length }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">总分块</span>
            <span class="stat-value">
              {{ knowledgeStore.documents.reduce((sum, doc) => sum + (doc.metadata?.chunkCount || 0), 0) }}
            </span>
          </div>
          <div class="stat-row">
            <span class="stat-label">总字符</span>
            <span class="stat-value">
              {{ (knowledgeStore.documents.reduce((sum, doc) => sum + (doc.metadata?.charCount || 0), 0) / 1000).toFixed(1) }}K
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
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
          @removeDoc="knowledgeStore.deleteDocument"
        />
      </div>

      <!-- 检索测试 -->
      <div v-show="activeTab === 'search'" class="content-panel">
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

      <!-- 效果评估 -->
      <div v-show="activeTab === 'eval'" class="content-panel">
        <KnowledgeEvalPanel />
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
  </div>
</template>

<style scoped>
.knowledge-page {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 0;
  height: 100%;
  background: #f9fafb;
}

/* 侧边栏 */
.sidebar {
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
  text-align: left;
}

.nav-item:hover {
  background: #f3f4f6;
}

.nav-item.active {
  background: #eff6ff;
  color: #2563eb;
}

.nav-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.nav-badge {
  padding: 2px 8px;
  background: #e5e7eb;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.nav-item.active .nav-badge {
  background: #dbeafe;
  color: #2563eb;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
}

.stats-card {
  background: #f9fafb;
  border-radius: 8px;
  padding: 12px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

/* 主内容区 */
.main-content {
  overflow-y: auto;
  padding: 24px;
}

.content-panel {
  max-width: 1400px;
  margin: 0 auto;
}

.panel-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

/* 响应式 */
@media (max-width: 1024px) {
  .knowledge-page {
    grid-template-columns: 200px 1fr;
  }
}

@media (max-width: 768px) {
  .knowledge-page {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }

  .main-content {
    padding: 16px;
  }
}
</style>
