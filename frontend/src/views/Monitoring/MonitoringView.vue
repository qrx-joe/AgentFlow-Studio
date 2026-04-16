<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { metricsApi } from '@/api'
import MonitoringToolbar from '@/components/monitoring/MonitoringToolbar.vue'
import MonitoringDailyTable from '@/components/monitoring/MonitoringDailyTable.vue'
import MonitoringTrends from '@/components/monitoring/MonitoringTrends.vue'

const loading = ref(false)
const summary = ref<any>(null)
const days = ref(7)
const failureThreshold = ref(0.2)
const cacheHitThreshold = ref(0.6)

const dailyLabels = computed(() => (summary.value?.daily || []).map((item: any) => item.date))
const dailyWorkflowTotal = computed(() => (summary.value?.daily || []).map((item: any) => item.workflowTotal))
const dailyFailureRate = computed(() =>
  (summary.value?.daily || []).map((item: any) =>
    item.workflowTotal ? item.workflowFailed / item.workflowTotal : 0
  )
)
const dailyCacheHitRate = computed(() =>
  (summary.value?.daily || []).map((item: any) =>
    (item.ragCacheHits + item.ragCacheMisses)
      ? item.ragCacheHits / (item.ragCacheHits + item.ragCacheMisses)
      : 0
  )
)

const load = async () => {
  loading.value = true
  try {
    summary.value = await metricsApi.summary(days.value, {
      failureRate: failureThreshold.value,
      cacheHitRate: cacheHitThreshold.value,
    })
  } finally {
    loading.value = false
  }
}

const exportCsv = () => {
  const rows = summary.value?.daily || []
  if (!rows.length) return
  const header = ['date', 'workflowTotal', 'workflowFailed', 'workflowDurationMs', 'knowledgeTotal', 'knowledgeDurationMs', 'ragCacheHits', 'ragCacheMisses']
  const lines = [header.join(',')]
  rows.forEach((item: any) => {
    lines.push([
      item.date,
      item.workflowTotal,
      item.workflowFailed,
      item.workflowDurationMs,
      item.knowledgeTotal,
      item.knowledgeDurationMs,
      item.ragCacheHits,
      item.ragCacheMisses,
    ].join(','))
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `metrics-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

onMounted(load)
</script>

<template>
  <div
    v-loading="loading"
    class="page"
  >
    <MonitoringToolbar
      v-model:days="days"
      v-model:failure-threshold="failureThreshold"
      v-model:cache-hit-threshold="cacheHitThreshold"
      @refresh="load"
      @export="exportCsv"
    />

    <div
      v-if="summary?.alerts?.length"
      class="alert"
    >
      <div
        v-for="(item, index) in summary.alerts"
        :key="index"
        class="alert-item"
      >
        {{ item.message }}
      </div>
    </div>
    <div class="card">
      <div class="title">
        工作流执行
      </div>
      <div class="metric">
        总次数：{{ summary?.workflow?.total ?? 0 }}
      </div>
      <div class="metric">
        失败次数：{{ summary?.workflow?.failed ?? 0 }}
      </div>
      <div class="metric">
        平均耗时：{{ summary?.workflow?.avgDurationMs ?? 0 }}ms
      </div>
    </div>

    <div class="card">
      <div class="title">
        知识检索
      </div>
      <div class="metric">
        总次数：{{ summary?.knowledge?.total ?? 0 }}
      </div>
      <div class="metric">
        平均耗时：{{ summary?.knowledge?.avgDurationMs ?? 0 }}ms
      </div>
    </div>

    <div class="card">
      <div class="title">
        RAG 缓存
      </div>
      <div class="metric">
        命中：{{ summary?.ragCache?.hits ?? 0 }}
      </div>
      <div class="metric">
        未命中：{{ summary?.ragCache?.misses ?? 0 }}
      </div>
      <div class="metric">
        命中率：{{ ((summary?.ragCache?.hitRate ?? 0) * 100).toFixed(2) }}%
      </div>
    </div>

    <div class="card full">
      <div class="title">
        每日统计
      </div>
      <MonitoringDailyTable :daily="summary?.daily || []" />
    </div>

    <div class="card full">
      <div class="title">
        趋势图
      </div>
      <MonitoringTrends
        :labels="dailyLabels"
        :workflow-values="dailyWorkflowTotal"
        :failure-rate-values="dailyFailureRate"
        :cache-hit-values="dailyCacheHitRate"
      />
    </div>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}


.card {
  background: #ffffff;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card.full {
  grid-column: 1 / -1;
}

.title {
  font-weight: 600;
  margin-bottom: 4px;
}

.metric {
  font-size: 13px;
  color: #334155;
}

</style>
.alert {
  grid-column: 1 / -1;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #9a3412;
  padding: 10px 12px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}
