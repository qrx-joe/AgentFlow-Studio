<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { metricsApi } from '@/api'

const loading = ref(false)
const summary = ref<any>(null)

const load = async () => {
  loading.value = true
  try {
    summary.value = await metricsApi.summary()
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page" v-loading="loading">
    <div class="card">
      <div class="title">工作流执行</div>
      <div class="metric">总次数：{{ summary?.workflow?.total ?? 0 }}</div>
      <div class="metric">失败次数：{{ summary?.workflow?.failed ?? 0 }}</div>
      <div class="metric">平均耗时：{{ summary?.workflow?.avgDurationMs ?? 0 }}ms</div>
    </div>

    <div class="card">
      <div class="title">知识检索</div>
      <div class="metric">总次数：{{ summary?.knowledge?.total ?? 0 }}</div>
      <div class="metric">平均耗时：{{ summary?.knowledge?.avgDurationMs ?? 0 }}ms</div>
    </div>

    <div class="card">
      <div class="title">RAG 缓存</div>
      <div class="metric">命中：{{ summary?.ragCache?.hits ?? 0 }}</div>
      <div class="metric">未命中：{{ summary?.ragCache?.misses ?? 0 }}</div>
      <div class="metric">命中率：{{ ((summary?.ragCache?.hitRate ?? 0) * 100).toFixed(2) }}%</div>
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

.title {
  font-weight: 600;
  margin-bottom: 4px;
}

.metric {
  font-size: 13px;
  color: #334155;
}
</style>
