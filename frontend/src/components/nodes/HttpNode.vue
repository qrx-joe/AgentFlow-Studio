<script setup lang="ts">
import { computed } from 'vue';
import { Connection } from '@element-plus/icons-vue';

const props = defineProps<{
  id: string;
  data: {
    label?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url?: string;
    status?: 'idle' | 'running' | 'success' | 'error';
  };
}>();

const statusColor = computed(() => {
  const colors = {
    idle: '#909399',
    running: 'var(--color-primary-900)',
    success: '#67c23a',
    error: '#f56c6c',
  };
  return colors[props.data.status || 'idle'];
});

const methodColor = computed(() => {
  const colors = {
    GET: '#67c23a',
    POST: 'var(--color-primary-900)',
    PUT: '#e6a23c',
    DELETE: '#f56c6c',
  };
  return colors[props.data.method || 'GET'];
});
</script>

<template>
  <div class="http-node" :style="{ borderColor: statusColor }">
    <div class="node-header">
      <div class="icon-wrapper">
        <el-icon><Connection /></el-icon>
      </div>
      <div class="node-info">
        <div class="node-label">
          {{ data.label || 'HTTP 请求' }}
        </div>
        <div class="node-meta">
          <el-tag :color="methodColor" size="small" effect="dark" class="method-tag">
            {{ data.method || 'GET' }}
          </el-tag>
        </div>
      </div>
    </div>
    <div v-if="data.url" class="node-body">
      <div class="url-display">
        {{ data.url }}
      </div>
    </div>
    <div class="node-handles">
      <div class="handle handle-source" />
    </div>
  </div>
</template>

<style scoped>
.http-node {
  min-width: 200px;
  background: #ffffff;
  border: 2px solid #909399;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  position: relative;
}

.http-node:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.node-header {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px 6px 0 0;
}

.icon-wrapper {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 18px;
}

.node-info {
  flex: 1;
  min-width: 0;
}

.node-label {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
}

.node-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.method-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border: none;
}

.node-body {
  padding: 12px;
  background: #f8fafc;
}

.url-display {
  font-size: 11px;
  color: #606266;
  font-family: 'JetBrains Mono', Consolas, monospace;
  word-break: break-all;
  line-height: 1.4;
}

.node-handles {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
}

.handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #ffffff;
  border: 2px solid var(--color-primary-900);
  border-radius: 50%;
  pointer-events: all;
  cursor: crosshair;
}

.handle-source {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.handle:hover {
  width: 14px;
  height: 14px;
  right: -7px;
  border-width: 3px;
}
</style>
