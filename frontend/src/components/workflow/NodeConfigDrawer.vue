<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { WorkflowNode } from '@/types'
import { ElMessage } from 'element-plus'
import NodePolicyFields from '@/components/workflow/NodePolicyFields.vue'
const props = defineProps<{
  modelValue: boolean
  node?: WorkflowNode
  nodeOptions?: Array<{ label: string; value: string }>
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'save', nodeId: string, data: Record<string, any>): void }>()
const form = reactive({
  label: '',
  model: 'gpt-4o-mini',
  prompt: '',
  topK: 3,
  scoreThreshold: 0.0,
  rerank: false,
  hybrid: false,
  chunkSize: 500,
  overlap: 50,
  variableKey: '',
  expectedValue: '',
  trueTarget: '',
  falseTarget: '',
  timeoutMs: 0,
  retryCount: 0,
  retryDelayMs: 0,
  onError: 'fail' as 'fail' | 'skip' | 'rollback' | 'compensate',
  compensateKeys: '',
  compensationActionsText: '',
})
watch(
  () => props.node,
  (node) => {
    if (!node) return
    form.label = node.data?.label || ''
    form.model = node.data?.model || 'gpt-4o-mini'
    form.prompt = node.data?.prompt || ''
    form.topK = node.data?.topK || 3
    form.scoreThreshold = node.data?.scoreThreshold ?? 0.0
    form.rerank = Boolean(node.data?.rerank)
    form.hybrid = Boolean(node.data?.hybrid)
    form.chunkSize = node.data?.chunkSize ?? 500
    form.overlap = node.data?.overlap ?? 50
    form.variableKey = node.data?.variableKey || ''
    form.expectedValue = node.data?.expectedValue || ''
    form.trueTarget = node.data?.trueTarget || ''
    form.falseTarget = node.data?.falseTarget || ''
    form.timeoutMs = node.data?.timeoutMs ?? 0
    form.retryCount = node.data?.retryCount ?? 0
    form.retryDelayMs = node.data?.retryDelayMs ?? 0
    form.compensateKeys = Array.isArray(node.data?.compensateKeys)
      ? node.data.compensateKeys.join(',')
      : ''
    form.compensationActionsText = Array.isArray(node.data?.compensationActions)
      ? JSON.stringify(node.data.compensationActions, null, 2)
      : ''
    if (
      node.data?.onError === 'skip' ||
      node.data?.onError === 'rollback' ||
      node.data?.onError === 'compensate'
    ) {
      form.onError = node.data.onError
    } else {
      form.onError = 'fail'
    }
  },
  { immediate: true }
)
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
const handleSave = () => {
  if (!props.node) return
  let compensationActions: Array<Record<string, any>> = []
  if (form.compensationActionsText.trim()) {
    try {
      const parsed = JSON.parse(form.compensationActionsText)
      if (!Array.isArray(parsed)) {
        ElMessage.warning('补偿动作必须是 JSON 数组')
        return
      }
      compensationActions = parsed
    } catch {
      ElMessage.warning('补偿动作 JSON 解析失败')
      return
    }
  }
  emit('save', props.node.id, {
    label: form.label,
    model: form.model,
    prompt: form.prompt,
    topK: form.topK,
    scoreThreshold: form.scoreThreshold,
    rerank: form.rerank,
    hybrid: form.hybrid,
    chunkSize: form.chunkSize,
    overlap: form.overlap,
    variableKey: form.variableKey,
    expectedValue: form.expectedValue,
    trueTarget: form.trueTarget,
    falseTarget: form.falseTarget,
    timeoutMs: form.timeoutMs,
    retryCount: form.retryCount,
    retryDelayMs: form.retryDelayMs,
    onError: form.onError,
    compensateKeys: form.compensateKeys
      .split(',')
      .map(item => item.trim())
      .filter(Boolean),
    compensationActions,
  })
  visible.value = false
}
</script>

<template>
  <el-drawer v-model="visible" title="节点配置" size="360px">
    <el-form label-width="80px">
      <el-form-item label="名称">
        <el-input v-model="form.label" placeholder="节点名称" />
      </el-form-item>

      <template v-if="node?.type === 'llm'">
        <el-form-item label="模型">
          <el-input v-model="form.model" placeholder="模型名称" />
        </el-form-item>
        <el-form-item label="Prompt">
          <el-input v-model="form.prompt" type="textarea" :rows="4" />
        </el-form-item>
      </template>
      <template v-if="node?.type === 'knowledge'">
        <el-form-item label="TopK">
          <el-input-number v-model="form.topK" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="阈值">
          <el-input-number v-model="form.scoreThreshold" :min="0" :max="1" :step="0.05" />
        </el-form-item>
        <el-form-item label="混合检索">
          <el-switch v-model="form.hybrid" />
        </el-form-item>
        <el-form-item label="重排序">
          <el-switch v-model="form.rerank" />
        </el-form-item>
        <el-form-item label="分块大小">
          <el-input-number v-model="form.chunkSize" :min="100" :max="2000" :step="50" />
        </el-form-item>
        <el-form-item label="重叠">
          <el-input-number v-model="form.overlap" :min="0" :max="500" :step="10" />
        </el-form-item>
      </template>
      <template v-if="node?.type === 'condition'">
        <el-form-item label="变量Key">
          <el-input v-model="form.variableKey" placeholder="如：node-1" />
        </el-form-item>
        <el-form-item label="期望值">
          <el-input v-model="form.expectedValue" placeholder="为空表示仅判断真值" />
        </el-form-item>
        <el-form-item label="提示">
          <div class="hint">
            连线点击可切换 True/False，系统以边 ID 作为分支绑定
          </div>
        </el-form-item>
        <el-form-item label="True目标">
          <el-select v-model="form.trueTarget" placeholder="选择 True 分支目标" clearable filterable>
            <el-option v-for="option in props.nodeOptions || []" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="False目标">
          <el-select v-model="form.falseTarget" placeholder="选择 False 分支目标" clearable filterable>
            <el-option v-for="option in props.nodeOptions || []" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
      </template><NodePolicyFields :form="form" />
    </el-form>
    <div class="actions">
      <el-button type="primary" @click="handleSave">保存配置</el-button>
    </div>
  </el-drawer>
</template>
<style scoped>
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.hint {
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}
</style>
