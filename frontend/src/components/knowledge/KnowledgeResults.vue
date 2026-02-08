<script setup lang="ts">
import type { SearchResult } from '@/types'

const props = defineProps<{
  searchResults: SearchResult[]
  searchStats: { total: number; filtered: number }
  searchQuery: string
  scoreThreshold: number
  hybrid: boolean
  rerank: boolean
  keywordMode: 'bm25' | 'tsrank' | 'trgm'
  vectorWeight: number
  keywordWeight: number
}>()

const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const highlightKeywords = (text: string) => {
  const keywords = props.searchQuery
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
  <div class="result" v-if="props.searchResults.length">
    <div class="stats">
      过滤前：{{ props.searchStats.total }} | 过滤后：{{ props.searchStats.filtered }} | threshold:
      {{ props.scoreThreshold }} | hybrid: {{ props.hybrid ? 'on' : 'off' }} | rerank:
      {{ props.rerank ? 'on' : 'off' }} | mode: {{ props.keywordMode }} | vw: {{ props.vectorWeight }} | kw:
      {{ props.keywordWeight }}
    </div>
    <div v-for="item in props.searchResults" :key="item.id" class="result-item">
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
</template>

<style scoped>
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
