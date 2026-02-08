<script setup lang="ts">
import MetricsLineChart from '@/components/monitoring/MetricsLineChart.vue'

const props = defineProps<{
  labels: string[]
  workflowValues: number[]
  failureRateValues: number[]
  cacheHitValues: number[]
}>()
</script>

<template>
  <div class="charts">
    <MetricsLineChart title="工作流执行量" :labels="props.labels" :values="props.workflowValues" />
    <MetricsLineChart title="失败率" :labels="props.labels" :values="props.failureRateValues" />
    <MetricsLineChart title="缓存命中率" :labels="props.labels" :values="props.cacheHitValues" />
  </div>
</template>

<style scoped>
.charts {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
</style>
