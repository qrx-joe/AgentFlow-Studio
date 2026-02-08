<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import KnowledgeDocumentsPanel from '@/components/knowledge/KnowledgeDocumentsPanel.vue'
import KnowledgeSearchPanel from '@/components/knowledge/KnowledgeSearchPanel.vue'
import KnowledgeResults from '@/components/knowledge/KnowledgeResults.vue'
import KnowledgeDocDrawer from '@/components/knowledge/KnowledgeDocDrawer.vue'

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
  <div class="page">
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

    <div class="panel">
      <div class="title">RAG 检索</div>
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


</style>
