<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  VideoPlay
} from '@element-plus/icons-vue'

const router = useRouter()
const lastSaved = ref('刚刚')

defineProps<{
  workflowName?: string
}>()

const emit = defineEmits(['back', 'run', 'publish'])

const handleBack = () => {
    router.push('/')
}
</script>

<template>
  <header class="studio-header">
    <div class="left-section">
      <div class="back-btn" @click="handleBack">
        <el-icon><ArrowLeft /></el-icon>
      </div>
      <div class="divider"></div>
      <div class="workflow-info">
        <div class="workflow-name">{{ workflowName || '未命名应用' }}</div>
        <div class="save-status">自动保存于 {{ lastSaved }}</div>
      </div>
    </div>

    <div class="center-section">
      <!-- 可以在这里放一些视图切换，如：设计/代码/预览 -->
    </div>

    <div class="right-section">
       <el-tooltip content="调试运行" placement="bottom">
        <el-button round class="action-btn" @click="$emit('run')">
          <el-icon><VideoPlay /></el-icon>
          <span class="btn-text">调试</span>
        </el-button>
      </el-tooltip>
      
      <el-button type="primary" round class="publish-btn" @click="$emit('publish')">
        发布
      </el-button>
    </div>
  </header>
</template>

<style scoped>
.studio-header {
  height: 56px;
  background: #ffffff;
  border-bottom: 1px solid var(--color-neutral-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  box-shadow: var(--shadow-sm);
  z-index: 50;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-neutral-600);
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--color-neutral-100);
  color: var(--color-neutral-900);
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--color-neutral-200);
}

.workflow-info {
  display: flex;
  flex-direction: column;
}

.workflow-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-neutral-900);
}

.save-status {
  font-size: 11px;
  color: var(--color-neutral-400);
}

.right-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
    border: none;
    background: var(--color-neutral-100);
    color: var(--color-neutral-700);
}

.action-btn:hover {
    background: var(--color-neutral-200);
}

.publish-btn {
    padding: 8px 20px;
    font-weight: 600;
}

.btn-text {
    margin-left: 6px;
}
</style>
