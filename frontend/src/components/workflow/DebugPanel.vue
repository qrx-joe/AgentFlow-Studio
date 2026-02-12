<script setup lang="ts">
import { ref, computed } from 'vue'
import { VideoPlay, Close, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

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

interface ExecutionResult {
  status: 'success' | 'error'
  output?: any
  error?: string
  duration: number
}

const props = defineProps<{
  visible: boolean
  inputs?: Array<{
    name: string
    label: string
    type: 'text' | 'textarea' | 'number'
    placeholder?: string
  }>
}>()

const emit = defineEmits(['update:visible', 'run'])

// 测试数据
const testData = ref<Record<string, any>>({
  input: '什么是人工智能？'
})

// 执行日志
const executionLogs = ref<ExecutionLog[]>([])

// 执行结果
const executionResult = ref<ExecutionResult | null>(null)

// 执行状态
const isRunning = ref(false)

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
  if (isRunning.value) return

  isRunning.value = true
  executionLogs.value = []
  executionResult.value = null

  try {
    // 添加开始日志
    addLog({
      nodeId: 'start',
      nodeName: '开始',
      level: 'info',
      message: '工作流开始执行',
      data: testData.value
    })

    // 触发执行
    emit('run', testData.value)

    // 模拟执行过程（实际应该从后端获取）
    await simulateExecution()

  } catch (error: any) {
    executionResult.value = {
      status: 'error',
      error: error.message,
      duration: 0
    }
    ElMessage.error('执行失败')
  } finally {
    isRunning.value = false
  }
}

// 添加日志
const addLog = (log: Omit<ExecutionLog, 'id' | 'timestamp'>) => {
  executionLogs.value.push({
    ...log,
    id: Date.now().toString(),
    timestamp: new Date().toLocaleTimeString()
  })
}

// 模拟执行（实际应该通过 WebSocket 或轮询获取实时日志）
const simulateExecution = async () => {
  const startTime = Date.now()

  // 模拟知识检索
  await new Promise(resolve => setTimeout(resolve, 800))
  addLog({
    nodeId: 'knowledge-1',
    nodeName: '知识检索',
    level: 'info',
    message: '正在检索相关知识...',
    duration: 800
  })

  await new Promise(resolve => setTimeout(resolve, 500))
  addLog({
    nodeId: 'knowledge-1',
    nodeName: '知识检索',
    level: 'success',
    message: '检索完成，找到 3 条相关文档',
    data: {
      topK: 3,
      results: [
        { score: 0.92, content: '人工智能是...' },
        { score: 0.85, content: 'AI 的发展历史...' },
        { score: 0.78, content: '机器学习是...' }
      ]
    },
    duration: 500
  })

  // 模拟 LLM 调用
  await new Promise(resolve => setTimeout(resolve, 1200))
  addLog({
    nodeId: 'llm-1',
    nodeName: 'LLM',
    level: 'info',
    message: '正在调用大模型生成回答...',
    duration: 1200
  })

  await new Promise(resolve => setTimeout(resolve, 800))
  addLog({
    nodeId: 'llm-1',
    nodeName: 'LLM',
    level: 'success',
    message: 'LLM 调用成功',
    data: {
      model: 'deepseek-chat',
      tokens: 256,
      response: '人工智能（Artificial Intelligence，AI）是计算机科学的一个分支...'
    },
    duration: 800
  })

  // 完成
  const duration = Date.now() - startTime
  addLog({
    nodeId: 'end',
    nodeName: '结束',
    level: 'success',
    message: '工作流执行完成',
    duration: duration
  })

  executionResult.value = {
    status: 'success',
    output: {
      answer: '人工智能（Artificial Intelligence，AI）是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。',
      sources: ['文档1', '文档2', '文档3']
    },
    duration
  }
}

// 清空日志
const clearLogs = () => {
  executionLogs.value = []
  executionResult.value = null
}

// 获取输入组件
const getInputComponent = (type: string) => {
  return type === 'textarea' ? 'el-input' : 'el-input'
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
          <h3 class="section-title">测试输入</h3>
          <el-button
            type="primary"
            :icon="VideoPlay"
            :loading="isRunning"
            @click="runTest"
          >
            {{ isRunning ? '执行中...' : '运行测试' }}
          </el-button>
        </div>
        <div class="section-content">
          <el-form label-position="top">
            <el-form-item
              v-for="input in (inputs || [{ name: 'input', label: '输入内容', type: 'textarea' }])"
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
              v-if="executionLogs.length > 0"
              :value="executionLogs.length"
              class="log-badge"
            />
          </h3>
          <el-button
            v-if="executionLogs.length > 0"
            text
            :icon="Delete"
            @click="clearLogs"
          >
            清空
          </el-button>
        </div>
        <div class="section-content">
          <el-empty
            v-if="executionLogs.length === 0"
            description="暂无执行日志"
            :image-size="80"
          />
          <el-timeline v-else>
            <el-timeline-item
              v-for="log in executionLogs"
              :key="log.id"
              :timestamp="log.timestamp"
              :type="getLogType(log.level)"
              placement="top"
            >
              <div class="log-entry">
                <div class="log-header">
                  <span class="log-node">{{ log.nodeName }}</span>
                  <span v-if="log.duration" class="log-duration">
                    {{ log.duration }}ms
                  </span>
                </div>
                <div class="log-message">{{ log.message }}</div>
                <div v-if="log.data" class="log-data">
                  <el-collapse>
                    <el-collapse-item title="查看详细数据" name="1">
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
      <section v-if="executionResult" class="debug-section">
        <div class="section-header">
          <h3 class="section-title">执行结果</h3>
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
              执行失败: {{ executionResult.error }}
            </template>
          </el-alert>
          <div class="output-data">
            <div class="output-label">输出数据:</div>
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
  color: #409eff;
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
