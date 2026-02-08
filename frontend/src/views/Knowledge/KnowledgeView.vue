<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'

const knowledgeStore = useKnowledgeStore()
const searchQuery = ref('')
const topK = ref(3)
const chunkSize = ref(500)
const overlap = ref(50)

onMounted(() => {
  knowledgeStore.fetchDocuments()
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
  await knowledgeStore.search(searchQuery.value, topK.value)
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
            <div class="meta">
              <span class="meta-item">size: {{ scope.row.metadata?.chunkSize ?? '-' }}</span>
              <span class="meta-item">overlap: {{ scope.row.metadata?.overlap ?? '-' }}</span>
              <span class="meta-item">chunks: {{ scope.row.metadata?.chunkCount ?? '-' }}</span>
              <span class="meta-item">chars: {{ scope.row.metadata?.charCount ?? '-' }}</span>
              <span class="meta-item">dim: {{ scope.row.metadata?.embeddingDim ?? '-' }}</span>
              <span class="meta-item">chunkMs: {{ scope.row.metadata?.chunkMs ?? '-' }}</span>
              <span class="meta-item">embedMs: {{ scope.row.metadata?.embedMs ?? '-' }}</span>
              <span class="meta-item">processMs: {{ scope.row.metadata?.processMs ?? '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="上传时间" width="180" />
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button size="small" type="danger" @click="knowledgeStore.deleteDocument(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="panel">
      <div class="title">RAG 检索</div>
      <div class="search">
        <el-input v-model="searchQuery" placeholder="输入检索问题" />
        <el-input-number v-model="topK" :min="1" :max="10" />
        <el-button type="success" :loading="knowledgeStore.searching" @click="handleSearch">检索</el-button>
      </div>

      <div class="result" v-if="knowledgeStore.searchResults.length">
        <div class="stats">
          过滤前：{{ knowledgeStore.searchStats.total }} | 过滤后：{{ knowledgeStore.searchStats.filtered }}
        </div>
        <div v-for="item in knowledgeStore.searchResults" :key="item.id" class="result-item">
          <div class="meta">相似度：{{ item.similarity.toFixed(3) }}</div>
          <div class="content">{{ item.content }}</div>
        </div>
      </div>
      <div v-else class="empty">暂无检索结果</div>
    </div>
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
  gap: 10px;
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

.meta {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
}

.content {
  font-size: 13px;
  color: #334155;
}

.empty {
  font-size: 12px;
  color: #94a3b8;
}
</style>
