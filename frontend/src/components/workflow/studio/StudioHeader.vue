<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  VideoPlay,
  Document,
  Clock,
  Setting,
  More,
  Loading,
  Download,
  Upload,
  Delete
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const lastSaved = ref('刚刚')
const saving = ref(false)

const props = defineProps<{
  workflowName?: string
  autoSave?: boolean
}>()

const emit = defineEmits(['back', 'run', 'publish', 'save', 'showVersions', 'showSettings'])

const handleBack = () => {
  router.push('/')
}

const handleSave = async () => {
  saving.value = true
  try {
    emit('save')
    lastSaved.value = '刚刚'
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handleShowVersions = () => {
  emit('showVersions')
}

const handleShowSettings = () => {
  emit('showSettings')
}

const saveStatusText = computed(() => {
  if (saving.value) return '保存中...'
  if (props.autoSave) return `自动保存于 ${lastSaved.value}`
  return `上次保存于 ${lastSaved.value}`
})
</script>

<template>
  <header class="studio-header">
    <div class="left-section">
      <el-tooltip content="返回首页" placement="bottom">
        <div class="back-btn" @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
        </div>
      </el-tooltip>
      <div class="divider"></div>
      <div class="workflow-info">
        <div class="workflow-name">{{ workflowName || '未命名应用' }}</div>
        <div class="save-status">
          <el-icon v-if="saving" class="is-loading"><Loading /></el-icon>
          {{ saveStatusText }}
        </div>
      </div>
    </div>

    <div class="center-section">
      <!-- 视图切换或其他中心控件 -->
    </div>

    <div class="right-section">
      <!-- 保存按钮 -->
      <el-tooltip content="保存工作流 (Ctrl+S)" placement="bottom">
        <el-button
          :icon="Document"
          :loading="saving"
          circle
          class="icon-btn"
          @click="handleSave"
        />
      </el-tooltip>

      <!-- 版本管理 -->
      <el-tooltip content="版本管理" placement="bottom">
        <el-button
          :icon="Clock"
          circle
          class="icon-btn"
          @click="handleShowVersions"
        />
      </el-tooltip>

      <!-- 设置 -->
      <el-dropdown trigger="click" @command="handleShowSettings">
        <el-button :icon="More" circle class="icon-btn" />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="settings">
              <el-icon><Setting /></el-icon>
              <span>工作流设置</span>
            </el-dropdown-item>
            <el-dropdown-item command="export">
              <el-icon><Download /></el-icon>
              <span>导出配置</span>
            </el-dropdown-item>
            <el-dropdown-item command="import">
              <el-icon><Upload /></el-icon>
              <span>导入配置</span>
            </el-dropdown-item>
            <el-dropdown-item divided command="delete" style="color: #f56c6c">
              <el-icon><Delete /></el-icon>
              <span>删除工作流</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <div class="divider"></div>

      <!-- 调试按钮 -->
      <el-tooltip content="调试运行" placement="bottom">
        <el-button class="action-btn" @click="$emit('run')">
          <el-icon><VideoPlay /></el-icon>
          <span class="btn-text">调试</span>
        </el-button>
      </el-tooltip>

      <!-- 发布按钮 -->
      <el-button type="primary" class="publish-btn" @click="$emit('publish')">
        发布
      </el-button>
    </div>
  </header>
</template>

<style scoped>
.studio-header {
  height: 56px;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  z-index: 50;
  flex-shrink: 0;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  color: #606266;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #f5f7fa;
  color: #303133;
}

.divider {
  width: 1px;
  height: 20px;
  background: #e4e7ed;
}

.workflow-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.workflow-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.save-status {
  font-size: 11px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.center-section {
  flex: 1;
  display: flex;
  justify-content: center;
}

.right-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: flex-end;
}

.icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  color: #606266;
}

.icon-btn:hover {
  background: #f5f7fa;
  border-color: #c0c4cc;
  color: #303133;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  color: #606266;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f5f7fa;
  border-color: #409eff;
  color: #409eff;
}

.publish-btn {
  padding: 8px 20px;
  font-weight: 600;
  font-size: 13px;
  border-radius: 6px;
}

.btn-text {
  font-size: 13px;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

:deep(.el-dropdown-menu__item .el-icon) {
  font-size: 14px;
}
</style>
