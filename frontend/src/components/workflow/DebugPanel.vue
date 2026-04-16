<script setup lang="ts">
import { ref, computed } from 'vue'
import { VideoPlay, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useWorkflowStore } from '@/stores/workflow'

interface ExecutionLog {
  id: string
  nodeId: string
  nodeName: string
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  data?: any
  duration?: number
}

interface InputField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number'
  placeholder?: string
}

defineProps<{
  visible: boolean
  inputs?: InputField[]
}>()

const emit = defineEmits(['update:visible', 'run'])

const workflowStore = useWorkflowStore()

// 测试数据
const testData = ref<Record<string, any>>({
  input: '什么是人工智能？'
})

// 执行日志（由后端真实数据转换而来）
const displayLogs = computed<ExecutionLog[]>(() => {
  const response = workflowStore.lastExecutionResponse
  if (!response) return []

  const logs: ExecutionLog[] = []
  const steps = response.steps || []
  const plainLogs = response.logs || []

  // 开始日志
  logs.push({
    id: 'start',
    nodeId: 'start',
    nodeName: '开始',
    timestamp: new Date().toLocaleTimeString(),
    level: 'info',
    message: '工作流开始执行',
    data: testData.value
  })

  // 步骤日志
  for (const step of steps) {
    const node = workflowStore.nodes.find(n => n.id === step.nodeId)
    const nodeName = node?.data?.label || node?.type || step.nodeId
    const levelMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
      running: 'info',
      success: 'success',
      failed: 'error',
      skipped: 'warning'
    }

    let message = `节点执行${step.status || '完成'}`
    if (step.status === 'success') message = '节点执行成功'
    if (step.status === 'failed') message = '节点执行失败'
    if (step.status === 'skipped') message = '节点已跳过'

    logs.push({
      id: `step-${step.nodeId}-${step.startTime}`,
      nodeId: step.nodeId,
      nodeName,
      timestamp: new Date(step.endTime || step.startTime).toLocaleTimeString(),
      level: levelMap[step.status] || 'info',
      message,
      data: step.output,
      duration: step.duration
    })
  }

  // 后端原始字符串日志（过滤掉已在步骤中体现的简单日志）
  for (const log of plainLogs) {
    if (typeof log !== 'string') continue
    // 跳过已在步骤中体现的节点执行日志
    if (log.startsWith('执行节点：') || log.startsWith('到达结束节点') || log.startsWith('条件节点已评估')) {
      continue
    }
    logs.push({
      id: `log-${log.slice(0, 20)}-${Date.now()}`,
      nodeId: 'system',
      nodeName: '系统',
      timestamp: new Date().toLocaleTimeString(),
      level: log.includes('失败') || log.includes('错误') ? 'error' : 'info',
      message: log
    })
  }

  // 结束日志
  const duration = steps.length > 0
    ? (steps[steps.length - 1].endTime || steps[steps.length - 1].startTime) - steps[0].startTime
    : 0

  if (response.status === 'completed') {
    logs.push({
      id: 'end',
      nodeId: 'end',
      nodeName: '结束',
      timestamp: new Date().toLocaleTimeString(),
      level: 'success',
      message: '工作流执行完成',
      duration
    })
  } else if (response.status === 'failed') {
    logs.push({
      id: 'end',
      nodeId: 'end',
      nodeName: '结束',
      timestamp: new Date().toLocaleTimeString(),
      level: 'error',
      message: `工作流执行失败: ${response.error || '未知错误'}`,
      duration
    })
  }

  return logs
})

// 执行结果
const executionResult = computed(() => {
  const response = workflowStore.lastExecutionResponse
  if (!response) return null

  const steps = response.steps || []
  const duration = steps.length > 0
    ? (steps[steps.length - 1].endTime || steps[steps.length - 1].startTime) - steps[0].startTime
    : 0

  return {
    status: response.status === 'completed' ? 'success' : 'error',
    output: response.output,
    error: response.error,
    duration
  }
})

// 日志类型映射
const getLogType = (level: string) => {
  const typeMap: Record<string, any> = {
    info: 'primary',
    success: 'success',
    warning: 'warning',
    error: 'danger'
  }
  return typeMap[level] || 'primary'
}

// 运行测试
const runTest = async () => {
  if (workflowStore.executing) return

  try {
    // 触发执行
    emit('run', testData.value)
  } catch (error: any) {
    ElMessage.error('执行失败')
  }
}

// 清空日志（同时清空 store 中的结果）
const clearLogs = () => {
  workflowStore.lastExecutionResponse = null
  workflowStore.executionLogs = []
}

// 关闭面板
const handleClose = () => {
  emit('update:visible', false)
}
</script>

<template>
  <el-drawer
    :model-value="visible"
    title="调试控制台"
    size="60%"
    direction="btt"
    @close="handleClose"
  >
    <div class="debug-panel">
      <!-- 输入区 -->
      <section class="debug-section">
        <div class="section-header">
          <h3 class="section-title">
            测试输入
          </h3>
          <el-button
            type="primary"
            :icon="VideoPlay"
            :loading="workflowStore.executing"
            @click="runTest"
          >
            {{ workflowStore.executing ? '执行中...' : '运行测试' }}
          </el-button>
        </div>
        <div class="section-content">
          <el-form label-position="top">
            <el-form-item
              v-for="input in (inputs || [{ name: 'input', label: '输入内容', type: 'textarea' as const, placeholder: '输入测试数据' }])"
              :key="input.name"
              :label="input.label"
            >
              <el-input
                v-if="input.type === 'textarea'"
                v-model="testData[input.name]"
                type="textarea"
                :rows="3"
                :placeholder="input.placeholder || '输入测试数据'"
              />
              <el-input
                v-else
                v-model="testData[input.name]"
                :placeholder="input.placeholder || '输入测试数据'"
              />
            </el-form-item>
          </el-form>
        </div>
      </section>

      <!-- 执行日志 -->
      <section class="debug-section">
        <div class="section-header">
          <h3 class="section-title">
            执行日志
            <el-badge
              v-if="displayLogs.length > 0"
              :value="displayLogs.length"
              class="log-badge"
            />
          </h3>
          <el-button
            v-if="displayLogs.length > 0"
            text
            :icon="Delete"
            @click="clearLogs"
          >
            清空
          </el-button>
        </div>
        <div class="section-content">
          <el-empty
            v-if="displayLogs.length === 0"
            description="暂无执行日志"
            :image-size="80"
          />
          <el-timeline v-else>
            <el-timeline-item
              v-for="log in displayLogs"
              :key="log.id"
              :timestamp="log.timestamp"
              :type="getLogType(log.level)"
              placement="top"
            >
              <div class="log-entry">
                <div class="log-header">
                  <span class="log-node">{{ log.nodeName }}</span>
                  <span
                    v-if="log.duration !== undefined"
                    class="log-duration"
                  >
                    {{ log.duration }}ms
                  </span>
                </div>
                <div class="log-message">
                  {{ log.message }}
                </div>
                <div
                  v-if="log.data !== undefined && log.data !== null"
                  class="log-data"
                >
                  <el-collapse>
                    <el-collapse-item
                      title="查看详细数据"
                      name="1"
                    >
                      <pre class="data-preview">{{ JSON.stringify(log.data, null, 2) }}</pre>
                    </el-collapse-item>
                  </el-collapse>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </section>

      <!-- 输出结果 -->
      <section
        v-if="executionResult"
        class="debug-section"
      >
        <div class="section-header">
          <h3 class="section-title">
            执行结果
          </h3>
          <el-tag
            :type="executionResult.status === 'success' ? 'success' : 'danger'"
            size="large"
          >
            {{ executionResult.status === 'success' ? '成功' : '失败' }}
          </el-tag>
        </div>
        <div class="section-content">
          <el-alert
            v-if="executionResult.status === 'success'"
            type="success"
            :closable="false"
            show-icon
          >
            <template #title>
              执行成功，耗时 {{ executionResult.duration }}ms
            </template>
          </el-alert>
          <el-alert
            v-else
            type="error"
            :closable="false"
            show-icon
          >
            <template #title>
              执行失败: {{ executionResult.error || '未知错误' }}
            </template>
          </el-alert>
          <div class="output-data">
            <div class="output-label">
              输出数据:
            </div>
            <pre class="data-preview">{{ JSON.stringify(executionResult.output, null, 2) }}</pre>
          </div>
        </div>
      </section>
    </div>
  </el-drawer>
</template>

<style scoped>
.debug-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0 4px;
}

.debug-section {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  padding: 16px 20px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-badge {
  margin-left: 8px;
}

.section-content {
  padding: 20px;
}

.log-entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.log-node {
  font-weight: 600;
  color: #303133;
  font-size: 13px;
}

.log-duration {
  font-size: 12px;
  color: #909399;
  font-family: 'JetBrains Mono', Consolas, monospace;
}

.log-message {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.log-data {
  margin-top: 8px;
}

:deep(.el-collapse) {
  border: none;
}

:deep(.el-collapse-item__header) {
  font-size: 12px;
  color: var(--color-primary-900);
  background: transparent;
  border: none;
  padding: 0;
  height: auto;
  line-height: 1.5;
}

:deep(.el-collapse-item__wrap) {
  border: none;
  background: transparent;
}

:deep(.el-collapse-item__content) {
  padding: 8px 0 0;
}

.data-preview {
  background: #f8fafc;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #303133;
  font-family: 'JetBrains Mono', Consolas, monospace;
  overflow-x: auto;
  margin: 0;
}

.output-data {
  margin-top: 16px;
}

.output-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

:deep(.el-timeline) {
  padding-left: 0;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: #909399;
}

:deep(.el-empty) {
  padding: 40px 0;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-drawer__header) {
  margin-bottom: 20px;
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
}

:deep(.el-drawer__title) {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

:deep(.el-drawer__body) {
  padding: 20px;
}
</style>