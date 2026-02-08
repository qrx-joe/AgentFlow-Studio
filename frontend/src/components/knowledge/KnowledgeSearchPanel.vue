<script setup lang="ts">
const props = defineProps<{
  searchQuery: string
  topK: number
  scoreThreshold: number
  hybrid: boolean
  rerank: boolean
  vectorWeight: number
  keywordWeight: number
  keywordMode: 'bm25' | 'tsrank' | 'trgm'
  searching: boolean
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void
  (e: 'update:topK', value: number): void
  (e: 'update:scoreThreshold', value: number): void
  (e: 'update:hybrid', value: boolean): void
  (e: 'update:rerank', value: boolean): void
  (e: 'update:vectorWeight', value: number): void
  (e: 'update:keywordWeight', value: number): void
  (e: 'update:keywordMode', value: 'bm25' | 'tsrank' | 'trgm'): void
  (e: 'search'): void
}>()

const onSearch = () => emit('search')
</script>

<template>
  <div class="search">
    <div class="search-row">
      <el-input
        :model-value="props.searchQuery"
        placeholder="输入检索问题"
        @update:model-value="value => emit('update:searchQuery', value)"
      />
      <el-input-number
        :model-value="props.topK"
        :min="1"
        :max="10"
        @update:model-value="value => emit('update:topK', Number(value))"
      />
      <el-input-number
        :model-value="props.scoreThreshold"
        :min="0"
        :max="1"
        :step="0.05"
        @update:model-value="value => emit('update:scoreThreshold', Number(value))"
      />
      <el-switch
        :model-value="props.hybrid"
        active-text="混合"
        @update:model-value="value => emit('update:hybrid', value)"
      />
      <el-switch
        :model-value="props.rerank"
        active-text="重排"
        @update:model-value="value => emit('update:rerank', value)"
      />
      <el-button type="success" :loading="props.searching" @click="onSearch">检索</el-button>
    </div>
    <div class="search-row">
      <span class="config-label">向量权重</span>
      <el-input-number
        :model-value="props.vectorWeight"
        :min="0"
        :max="2"
        :step="0.05"
        @update:model-value="value => emit('update:vectorWeight', Number(value))"
      />
      <span class="config-label">关键词权重</span>
      <el-input-number
        :model-value="props.keywordWeight"
        :min="0"
        :max="2"
        :step="0.05"
        @update:model-value="value => emit('update:keywordWeight', Number(value))"
      />
      <span class="config-label">关键词模式</span>
      <el-select
        :model-value="props.keywordMode"
        style="width: 140px"
        @update:model-value="value => emit('update:keywordMode', value)"
      >
        <el-option label="BM25" value="bm25" />
        <el-option label="TS Rank" value="tsrank" />
        <el-option label="Trigram" value="trgm" />
      </el-select>
    </div>
  </div>
</template>

<style scoped>
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

.config-label {
  font-size: 12px;
  color: #64748b;
}
</style>
