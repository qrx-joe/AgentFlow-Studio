<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { WorkflowNode } from '@/types'

// 配置面板：双击节点后编辑其参数
const props = defineProps<{
  modelValue: boolean
  node?: WorkflowNode
  nodeOptions?: Array<{ label: string; value: string }>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', nodeId: string, data: Record<string, any>): void
}>()

// 使用局部表单避免直接修改原对象
const form = reactive({
  label: '',
  model: 'gpt-4o-mini',
  prompt: '',
  topK: 3,
  variableKey: '',
  expectedValue: '',
  trueTarget: '',
  falseTarget: '',
})

watch(
  () => props.node,
  (node) => {
    if (!node) return
    form.label = node.data?.label || ''
    form.model = node.data?.model || 'gpt-4o-mini'
    form.prompt = node.data?.prompt || ''
    form.topK = node.data?.topK || 3
    form.variableKey = node.data?.variableKey || ''
    form.expectedValue = node.data?.expectedValue || ''
    form.trueTarget = node.data?.trueTarget || ''
    form.falseTarget = node.data?.falseTarget || ''
  },
  { immediate: true }
)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const handleSave = () => {
  if (!props.node) return
  emit('save', props.node.id, {
    label: form.label,
    model: form.model,
    prompt: form.prompt,
    topK: form.topK,
    variableKey: form.variableKey,
    expectedValue: form.expectedValue,
    trueTarget: form.trueTarget,
    falseTarget: form.falseTarget,
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
          <el-select
            v-model="form.trueTarget"
            placeholder="选择 True 分支目标"
            clearable
            filterable
          >
            <el-option
              v-for="option in props.nodeOptions || []"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="False目标">
          <el-select
            v-model="form.falseTarget"
            placeholder="选择 False 分支目标"
            clearable
            filterable
          >
            <el-option
              v-for="option in props.nodeOptions || []"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </template>
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
