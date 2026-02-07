<script setup lang="ts">
// 执行日志面板
defineProps<{ logs: string[] }>()
</script>

<template>
  <div class="log">
    <div class="title">执行日志</div>
    <div v-if="logs.length === 0" class="empty">暂无日志</div>
    <div v-else class="list">
      <div v-for="(item, index) in logs" :key="index" class="item">
        {{ item }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.log {
  background: #ffffff;
  border-radius: 12px;
  padding: 12px;
  height: 220px;
  overflow: auto;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 10px;
}

.empty {
  color: #94a3b8;
  font-size: 12px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item {
  font-size: 12px;
  color: #334155;
}
</style>
