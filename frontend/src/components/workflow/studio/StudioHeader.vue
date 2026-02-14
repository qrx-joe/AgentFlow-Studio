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
  Delete,
  Edit
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const lastSaved = ref('刚刚')
const saving = ref(false)

// 颜色列表
const colors = ['#475569', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6']

const props = defineProps<{
  workflowName?: string
  workflowDescription?: string
  workflowColor?: string
  autoSave?: boolean
}>()

const emit = defineEmits([
  'back', 'run', 'publish', 'save', 'showVersions', 'showSettings',
  'update:workflowName', 'update:workflowDescription', 'update:workflowColor'
])

// 编辑对话框
const editDialogVisible = ref(false)
const editForm = ref({
  name: '',
  description: '',
  color: '#475569'
})

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

// 打开编辑对话框
const handleShowEdit = () => {
  editForm.value = {
    name: props.workflowName || '',
    description: props.workflowDescription || '',
    color: props.workflowColor || '#475569'
  }
  editDialogVisible.value = true
}

// 保存编辑
const handleSaveEdit = () => {
  if (!editForm.value.name.trim()) {
    ElMessage.warning('请输入应用名称')
    return
  }
  emit('update:workflowName', editForm.value.name)
  emit('update:workflowDescription', editForm.value.description)
  emit('update:workflowColor', editForm.value.color)
  editDialogVisible.value = false
  ElMessage.success('信息已更新')
}

const saveStatusText = computed(() => {
  if (saving.value) return '保存中...'
  if (props.autoSave) return `自动保存于 ${lastSaved.value}`
  return `上次保存于 ${lastSaved.value}`
})

const currentColor = computed(() => props.workflowColor || '#475569')
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
      <div class="workflow-info" @click="handleShowEdit">
        <div class="workflow-name-row">
          <div class="workflow-icon" :style="{ background: currentColor + '15', color: currentColor }">
            {{ (workflowName || '未').slice(0, 1) }}
          </div>
          <div class="workflow-name">{{ workflowName || '未命名应用' }}</div>
          <el-icon class="edit-icon"><Edit /></el-icon>
        </div>
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

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑应用信息"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" label-position="top">
        <el-form-item label="应用名称" required>
          <el-input
            v-model="editForm.name"
            placeholder="输入应用名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="应用描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="描述应用的功能和用途（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="主题颜色">
          <div class="color-picker">
            <div
              v-for="color in colors"
              :key="color"
              class="color-option"
              :class="{ active: editForm.color === color }"
              :style="{ background: color }"
              @click="editForm.color = color"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEdit">保存</el-button>
      </template>
    </el-dialog>
  </header>
</template>

<style scoped>
.studio-header {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  z-index: 100;
  flex-shrink: 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
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
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all 0.2s;
}

.workflow-info:hover {
  background: #f5f7fa;
}

.workflow-info:hover .edit-icon {
  opacity: 1;
}

.workflow-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workflow-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}

.workflow-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.edit-icon {
  font-size: 12px;
  color: #909399;
  opacity: 0;
  transition: opacity 0.2s;
}

.save-status {
  font-size: 11px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 36px;
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
  border-color: var(--color-primary-600);
  background: var(--color-primary-900);
  color: white;
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

/* 颜色选择器 */
.color-picker {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: #0f172a;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px currentColor;
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
