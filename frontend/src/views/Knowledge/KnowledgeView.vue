<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'

const knowledgeStore = useKnowledgeStore()
const searchQuery = ref('')
const topK = ref(3)
const scoreThreshold = ref(0)
const hybrid = ref(false)
const rerank = ref(false)
const vectorWeight = ref(1)
const keywordWeight = ref(0)
const keywordMode = ref<'bm25' | 'tsrank' | 'trgm'>('bm25')
const chunkSize = ref(500)
const overlap = ref(50)
const showDocDrawer = ref(false)
const selectedDoc = ref<any>(null)
const chunkLimit = ref(5)
const focusKey = 'knowledgeDocFocus'
const focusSnippet = ref('')
const focusedChunkId = ref('')

onMounted(() => {
  knowledgeStore.fetchDocuments().then(() => {
    focusFromStorage()
  })
})

const handleUpload = async (file: any) => {
  await knowledgeStore.uploadDocument(file.raw, {
    chunkSize: chunkSize.value,
    overlap: overlap.value,
  })
  return false
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
  await highlightChunk()
}

const openDocDetailById = async (docId: string) => {
  const doc = knowledgeStore.documents.find(item => item.id === docId)
  if (doc) {
    await openDocDetail(doc)
  }
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

const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const highlightKeywords = (text: string) => {
  const keywords = searchQuery.value
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean)

  let html = escapeHtml(text)
  for (const word of keywords) {
    const safeWord = escapeHtml(word)
    if (safeWord && html.includes(safeWord)) {
      html = html.split(safeWord).join(`<mark class="hit">${safeWord}</mark>`)
    }
  }
  return html
}
</script>

<template>
  <div class="page">
    <div class="panel">
      <div class="title">文档管理</div>
      <el-upload :before-upload="handleUpload" :show-file-list="false">
        <el-button type="primary" :loading="knowledgeStore.uploading">上传文档</el-button>
      </el-upload>

      <div class="config">
        <el-input-number v-model="chunkSize" :min="100" :max="2000" :step="50" />
        <span class="config-label">分块大小</span>
        <el-input-number v-model="overlap" :min="0" :max="500" :step="10" />
        <span class="config-label">重叠</span>
      </div>

      <el-table :data="knowledgeStore.documents" style="width: 100%" v-loading="knowledgeStore.loading">
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
            <el-button size="small" @click="openDocDetail(scope.row)">详情</el-button>
            <el-button size="small" type="danger" @click="knowledgeStore.deleteDocument(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="panel">
      <div class="title">RAG 检索</div>
      <div class="search">
        <div class="search-row">
          <el-input v-model="searchQuery" placeholder="输入检索问题" />
          <el-input-number v-model="topK" :min="1" :max="10" />
          <el-input-number v-model="scoreThreshold" :min="0" :max="1" :step="0.05" />
          <el-switch v-model="hybrid" active-text="混合" />
          <el-switch v-model="rerank" active-text="重排" />
          <el-button type="success" :loading="knowledgeStore.searching" @click="handleSearch">检索</el-button>
        </div>
        <div class="search-row">
          <span class="config-label">向量权重</span>
          <el-input-number v-model="vectorWeight" :min="0" :max="2" :step="0.05" />
          <span class="config-label">关键词权重</span>
          <el-input-number v-model="keywordWeight" :min="0" :max="2" :step="0.05" />
          <span class="config-label">关键词模式</span>
          <el-select v-model="keywordMode" style="width: 140px">
            <el-option label="BM25" value="bm25" />
            <el-option label="TS Rank" value="tsrank" />
            <el-option label="Trigram" value="trgm" />
          </el-select>
        </div>
      </div>

      <div class="result" v-if="knowledgeStore.searchResults.length">
        <div class="stats">
          过滤前：{{ knowledgeStore.searchStats.total }} | 过滤后：{{ knowledgeStore.searchStats.filtered }}
          | threshold: {{ scoreThreshold }} | hybrid: {{ hybrid ? 'on' : 'off' }} | rerank: {{ rerank ? 'on' : 'off' }}
          | mode: {{ keywordMode }} | vw: {{ vectorWeight }} | kw: {{ keywordWeight }}
        </div>
        <div v-for="item in knowledgeStore.searchResults" :key="item.id" class="result-item">
          <div class="meta">
            相似度：{{ item.similarity.toFixed(3) }}
            <span v-if="item.fusedScore !== undefined">| 融合分：{{ item.fusedScore.toFixed(3) }}</span>
            <span v-if="item.keywordHits !== undefined">| 关键词命中：{{ item.keywordHits }}</span>
            <span v-if="item.keywordScore !== undefined">| 关键词分：{{ item.keywordScore.toFixed(3) }}</span>
          </div>
          <div class="score-bar">
            <div
              class="score-fill"
              :style="{ width: `${Math.min((item.fusedScore ?? item.similarity) / 1.5, 1) * 100}%` }"
            ></div>
          </div>
          <div class="content" v-html="highlightKeywords(item.content)"></div>
        </div>
      </div>
      <div v-else class="empty">暂无检索结果</div>
    </div>

    <el-drawer v-model="showDocDrawer" title="文档详情" size="420px">
      <div v-if="selectedDoc" class="doc-detail">
        <div class="detail-row"><span class="label">文件名</span>{{ selectedDoc.filename }}</div>
        <div class="detail-row"><span class="label">类型</span>{{ selectedDoc.fileType || '-' }}</div>
        <div class="detail-row"><span class="label">大小</span>{{ selectedDoc.fileSize || '-' }}</div>

        <div class="detail-section">
          <div class="section-title">分块参数</div>
          <div class="detail-row"><span class="label">size</span>{{ selectedDoc.metadata?.chunkSize ?? '-' }}</div>
          <div class="detail-row"><span class="label">overlap</span>{{ selectedDoc.metadata?.overlap ?? '-' }}</div>
          <div class="detail-row"><span class="label">chunks</span>{{ selectedDoc.metadata?.chunkCount ?? '-' }}</div>
          <div class="detail-row"><span class="label">chars</span>{{ selectedDoc.metadata?.charCount ?? '-' }}</div>
          <div class="detail-row"><span class="label">dim</span>{{ selectedDoc.metadata?.embeddingDim ?? '-' }}</div>
          <div class="detail-row"><span class="label">chunkMs</span>{{ selectedDoc.metadata?.chunkMs ?? '-' }}</div>
          <div class="detail-row"><span class="label">embedMs</span>{{ selectedDoc.metadata?.embedMs ?? '-' }}</div>
          <div class="detail-row"><span class="label">processMs</span>{{ selectedDoc.metadata?.processMs ?? '-' }}</div>
        </div>

        <div class="detail-section">
          <div class="section-title">分块示例</div>
          <div class="chunk-config">
            <el-input-number v-model="chunkLimit" :min="1" :max="20" :step="1" />
            <el-button size="small" @click="knowledgeStore.fetchDocumentChunks(selectedDoc.id, chunkLimit)">刷新</el-button>
          </div>
          <div v-if="knowledgeStore.chunkLoading" class="loading">加载中...</div>
          <div v-else class="chunks">
            <div
              v-for="chunk in knowledgeStore.documentChunks"
              :key="chunk.id"
              :id="`chunk-${chunk.id}`"
              class="chunk-item"
              :class="{ focused: chunk.id === focusedChunkId }"
            >
              <div class="chunk-title">#{{ chunk.chunkIndex }}</div>
              <div class="chunk-content">{{ chunk.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

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

.search {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.search-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
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

.result-item {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
}

.stats {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}

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

.meta {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
}

.content {
  font-size: 13px;
  color: #334155;
}

.score-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
  margin: 6px 0 8px;
}

.score-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8 0%, #16a34a 100%);
}

.hit {
  background: #fef9c3;
  color: #854d0e;
  padding: 0 2px;
  border-radius: 4px;
}

.empty {
  font-size: 12px;
  color: #94a3b8;
}
</style>
