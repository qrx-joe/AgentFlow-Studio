<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { metricsApi } from '@/api'

const loading = ref(false)
const summary = ref<any>(null)
const days = ref(7)
const failureThreshold = ref(0.2)
const cacheHitThreshold = ref(0.6)

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

onMounted(load)
</script>

<template>
  <div class="page" v-loading="loading">
    <div class="toolbar">
      <span class="label">时间范围(天)</span>
      <el-input-number v-model="days" :min="1" :max="30" :step="1" />
      <span class="label">失败阈值</span>
      <el-input-number v-model="failureThreshold" :min="0" :max="1" :step="0.05" />
      <span class="label">缓存阈值</span>
      <el-input-number v-model="cacheHitThreshold" :min="0" :max="1" :step="0.05" />
      <el-button size="small" @click="load">刷新</el-button>
    </div>

    <div v-if="summary?.alerts?.length" class="alert">
      <div v-for="(item, index) in summary.alerts" :key="index" class="alert-item">
        {{ item.message }}
      </div>
    </div>
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

    <div class="card full">
      <div class="title">每日统计</div>
      <div v-if="summary?.daily?.length" class="table">
        <div class="row header">
          <span>日期</span>
          <span>工作流</span>
          <span>失败</span>
          <span>检索</span>
          <span>缓存命中率</span>
        </div>
        <div v-for="item in summary.daily" :key="item.date" class="row">
          <span>{{ item.date }}</span>
          <span>{{ item.workflowTotal }}</span>
          <span>{{ item.workflowFailed }}</span>
          <span>{{ item.knowledgeTotal }}</span>
          <span>
            {{
              ((item.ragCacheHits + item.ragCacheMisses)
                ? (item.ragCacheHits / (item.ragCacheHits + item.ragCacheMisses))
                : 0
              ).toFixed(2)
            }}
          </span>
        </div>
      </div>
      <div v-else class="muted">暂无数据</div>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.toolbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 12px;
  color: #64748b;
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
