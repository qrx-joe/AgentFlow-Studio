<script setup lang="ts">
import { computed } from 'vue'
import {
  Setting,
  Delete
} from '@element-plus/icons-vue'

const props = defineProps<{
  node: any
}>()

const emit = defineEmits(['update', 'delete'])

// Mock config schema based on node type
const isLLM = computed(() => props.node?.type === 'llm')
const isKnowledge = computed(() => props.node?.type === 'knowledge')
const isCondition = computed(() => props.node?.type === 'condition')
const isCode = computed(() => props.node?.type === 'code')
const isEnd = computed(() => props.node?.type === 'end')

</script>

<template>
  <div class="properties-panel">
    <div v-if="!node" class="empty-state">
      <el-icon class="empty-icon"><Setting /></el-icon>
      <span class="empty-text">选择一个节点进行配置</span>
    </div>

    <div v-else class="config-content">
      <div class="panel-header">
        <span class="node-type">{{ node.type?.toUpperCase() || 'NODE' }}</span>
        <div class="actions">
             <el-button link type="danger" :icon="Delete" @click="$emit('delete', node.id)" />
        </div>
      </div>

      <el-form label-position="top" class="config-form">
        <!-- Common: Label -->
        <el-form-item label="节点名称">
          <el-input 
            :model-value="node.data?.label" 
            @input="$emit('update', node.id, { label: $event })" 
          />
        </el-form-item>

        <!-- LLM Specific -->
        <template v-if="isLLM">
          <el-form-item label="模型选择">
            <el-select 
              :model-value="node.data?.model || 'gpt-3.5-turbo'"
              @update:model-value="$emit('update', node.id, { model: $event })"
            >
              <el-option label="GPT-3.5 Turbo" value="gpt-3.5-turbo" />
              <el-option label="GPT-4" value="gpt-4" />
              <el-option label="DeepSeek Chat" value="deepseek-chat" />
            </el-select>
          </el-form-item>
          <el-form-item label="系统提示词 (System)">
            <el-input 
              type="textarea" 
              :rows="4"
              :model-value="node.data?.systemPrompt"
               @input="$emit('update', node.id, { systemPrompt: $event })"
            />
          </el-form-item>
        </template>
        
        <!-- Knowledge Specific -->
        <template v-if="isKnowledge">
             <el-form-item label="知识库集合">
                <el-select placeholder="选择知识库" :model-value="node.data?.dataset || 'default'" @update:model-value="$emit('update', node.id, { dataset: $event })">
                    <el-option label="默认知识库" value="default" />
                    <el-option label="公司规章制度" value="doc-1" />
                    <el-option label="产品技术文档" value="doc-2" />
                </el-select>
             </el-form-item>
             <el-form-item label="召回数量 (TopK)">
                <el-input-number 
                    :model-value="node.data?.topK || 3" 
                    :min="1" 
                    :max="10"
                    @update:model-value="$emit('update', node.id, { topK: $event })"
                />
             </el-form-item>
        </template>

        <!-- Condition Specific -->
        <template v-if="isCondition">
             <el-form-item label="判断条件 (Expression)">
                <el-input 
                    type="textarea"
                    placeholder="e.g. input.includes('error')"
                    :model-value="node.data?.expression" 
                    @input="$emit('update', node.id, { expression: $event })"
                />
             </el-form-item>
             <div class="tip">支持简单的 JavaScript 表达式</div>
        </template>

        <!-- Code Specific -->
        <template v-if="isCode">
             <el-form-item label="代码逻辑 (JavaScript)">
                <el-input 
                    type="textarea"
                    :rows="6"
                    placeholder="return { result: 'ok' }"
                    :model-value="node.data?.code" 
                    @input="$emit('update', node.id, { code: $event })"
                    class="code-editor"
                />
             </el-form-item>
        </template>
        
        <!-- End Specific -->
        <template v-if="isEnd">
             <el-form-item label="输出变量">
                <el-input 
                    placeholder="output_variable"
                    :model-value="node.data?.outputVar || 'result'" 
                    @input="$emit('update', node.id, { outputVar: $event })"
                />
             </el-form-item>
        </template>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.properties-panel {
  width: 100%;
  height: 100%;
  background: #ffffff;
  border-left: 1px solid var(--color-neutral-200);
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-400);
  gap: 12px;
}

.empty-icon {
  font-size: 48px;
  color: var(--color-neutral-200);
}

.empty-text {
  font-size: 13px;
}

.config-content {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-neutral-100);
  background: var(--color-neutral-50);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.node-type {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-neutral-500);
  letter-spacing: 0.5px;
}

.config-form {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
}

:deep(.el-form-item__label) {
    font-size: 12px !important;
    color: var(--color-neutral-600) !important;
    font-weight: 500;
}

.tip {
    font-size: 12px;
    color: var(--color-neutral-400);
    margin-top: -8px;
    margin-bottom: 16px;
}

.code-editor :deep(textarea) {
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
    background: #f8fafc;
}
</style>
