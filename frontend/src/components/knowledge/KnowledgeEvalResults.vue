<script setup lang="ts">
const props = defineProps<{
  result: any
}>()
</script>

<template>
  <div v-if="props.result" class="result">
    <div class="metrics">
      <div class="metric">Baseline Hit@K: {{ props.result.baseline.hitRate.toFixed(4) }}</div>
      <div class="metric">Baseline MRR: {{ props.result.baseline.mrr.toFixed(4) }}</div>
      <div v-if="props.result.compare" class="metric">
        Compare Hit@K: {{ props.result.compare.hitRate.toFixed(4) }}
      </div>
      <div v-if="props.result.compare" class="metric">
        Compare MRR: {{ props.result.compare.mrr.toFixed(4) }}
      </div>
    </div>
    <div v-if="props.result?.baseline?.perQuery?.length" class="table">
      <div class="row header">
        <span>Query</span>
        <span>Baseline</span>
        <span>Compare</span>
      </div>
      <div v-for="(item, index) in props.result.baseline.perQuery" :key="index" class="row">
        <span class="query">{{ item.query }}</span>
        <span>{{ item.hit ? `Hit@${item.rank}` : 'Miss' }}</span>
        <span v-if="props.result.compare">
          {{ props.result.compare.perQuery?.[index]?.hit ? `Hit@${props.result.compare.perQuery[index].rank}` : 'Miss' }}
        </span>
        <span v-else>-</span>
      </div>
    </div>
  </div>
  <div v-else class="muted">暂无结果</div>
</template>

<style scoped>
.result {
  display: grid;
  gap: 10px;
}

.metrics {
  display: grid;
  gap: 6px;
}

.metric {
  font-size: 12px;
  color: #0f172a;
}

.table {
  display: grid;
  gap: 6px;
}

.row {
  display: grid;
  grid-template-columns: 1.4fr 0.6fr 0.6fr;
  gap: 8px;
  font-size: 12px;
  color: #334155;
}

.row.header {
  font-weight: 600;
  color: #64748b;
}

.query {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.muted {
  font-size: 12px;
  color: #94a3b8;
}
</style>
