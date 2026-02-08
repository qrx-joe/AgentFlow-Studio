<script setup lang="ts">
const props = defineProps<{
  daily: Array<{
    date: string
    workflowTotal: number
    workflowFailed: number
    knowledgeTotal: number
    ragCacheHits: number
    ragCacheMisses: number
  }>
}>()
</script>

<template>
  <div class="table" v-if="props.daily.length">
    <div class="row header">
      <span>日期</span>
      <span>工作流</span>
      <span>失败</span>
      <span>检索</span>
      <span>缓存命中率</span>
    </div>
    <div v-for="item in props.daily" :key="item.date" class="row">
      <span>{{ item.date }}</span>
      <span>{{ item.workflowTotal }}</span>
      <span>{{ item.workflowFailed }}</span>
      <span>{{ item.knowledgeTotal }}</span>
      <span>
        {{
          ((item.ragCacheHits + item.ragCacheMisses)
            ? item.ragCacheHits / (item.ragCacheHits + item.ragCacheMisses)
            : 0
          ).toFixed(2)
        }}
      </span>
    </div>
  </div>
  <div v-else class="muted">暂无数据</div>
</template>

<style scoped>
.table {
  display: grid;
  gap: 6px;
}

.row {
  display: grid;
  grid-template-columns: 1fr repeat(4, 0.6fr);
  gap: 8px;
  font-size: 12px;
  color: #334155;
}

.row.header {
  font-weight: 600;
  color: #64748b;
}

.muted {
  font-size: 12px;
  color: #94a3b8;
}
</style>
