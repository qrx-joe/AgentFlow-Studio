<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElCollapseTransition } from 'element-plus'
import {
  Setting,
  Delete,
  InfoFilled,
  ArrowRight,
  Connection
} from '@element-plus/icons-vue'

const props = defineProps<{
  node: any
  edge?: any
}>()

const emit = defineEmits(['update', 'delete', 'update-edge', 'delete-edge'])

// Mock config schema based on node type
const isLLM = computed(() => props.node?.type === 'llm')
const isKnowledge = computed(() => props.node?.type === 'knowledge')
const isCondition = computed(() => props.node?.type === 'condition')
const isCode = computed(() => props.node?.type === 'code')
const isEnd = computed(() => props.node?.type === 'end')
const isTrigger = computed(() => props.node?.type === 'trigger')
const isHttp = computed(() => props.node?.type === 'http')

// 展开/折叠状态
const expandedSections = ref<Record<string, boolean>>({
  basic: true,
  config: true,
  input: false,
  output: false,
  error: false
})

const toggleSection = (section: string) => {
  if (section in expandedSections.value) {
    expandedSections.value[section] = !expandedSections.value[section]
  }
}

</script>

<template>
  <div class="properties-panel">
    <!-- 空状态 -->
    <div
      v-if="!node && !edge"
      class="empty-state"
    >
      <el-icon class="empty-icon">
        <Setting />
      </el-icon>
      <span class="empty-text">选择节点或连线进行配置</span>
    </div>

    <!-- 边编辑面板 -->
    <div
      v-else-if="edge"
      class="config-content"
    >
      <div class="panel-header">
        <div class="header-left">
          <span class="node-type-badge type-edge">
            <el-icon><Connection /></el-icon>
            连线
          </span>
          <span class="node-id">ID: {{ edge.id.slice(0, 8) }}</span>
        </div>
        <el-button
          link
          type="danger"
          :icon="Delete"
          @click="$emit('delete-edge', edge.id)"
        />
      </div>

      <div class="config-sections">
        <div class="section">
          <div
            class="section-header"
            @click="toggleSection('basic')"
          >
            <span class="section-title">连线配置</span>
            <el-icon
              class="toggle-icon"
              :class="{ expanded: expandedSections.basic }"
            >
              <ArrowRight />
            </el-icon>
          </div>
          <el-collapse-transition>
            <div
              v-show="expandedSections.basic"
              class="section-content"
            >
              <el-form
                label-position="top"
                size="default"
              >
                <el-form-item label="连线标签">
                  <el-input
                    :model-value="edge.label"
                    placeholder="输入连线标签（可选）"
                    @input="$emit('update-edge', edge.id, { label: $event })"
                  />
                </el-form-item>
                <el-form-item label="分支类型">
                  <el-select
                    :model-value="edge.branchType || ''"
                    style="width: 100%"
                    clearable
                    placeholder="选择分支类型"
                    @update:model-value="$emit('update-edge', edge.id, { branchType: $event || undefined, label: $event || edge.label })"
                  >
                    <el-option
                      label="True (条件成立)"
                      value="True"
                    />
                    <el-option
                      label="False (条件不成立)"
                      value="False"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="连线样式">
                  <el-select
                    :model-value="edge.type || 'default'"
                    style="width: 100%"
                    @update:model-value="$emit('update-edge', edge.id, { type: $event })"
                  >
                    <el-option
                      label="默认"
                      value="default"
                    />
                    <el-option
                      label="分支线"
                      value="branch"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="动画效果">
                  <el-switch
                    :model-value="edge.animated || false"
                    @update:model-value="$emit('update-edge', edge.id, { animated: $event })"
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-collapse-transition>
        </div>

        <div class="section">
          <div
            class="section-header"
            @click="toggleSection('config')"
          >
            <span class="section-title">连接信息</span>
            <el-icon
              class="toggle-icon"
              :class="{ expanded: expandedSections.config }"
            >
              <ArrowRight />
            </el-icon>
          </div>
          <el-collapse-transition>
            <div
              v-show="expandedSections.config"
              class="section-content"
            >
              <div class="info-row">
                <span class="info-label">源节点</span>
                <span class="info-value">{{ edge.source }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">目标节点</span>
                <span class="info-value">{{ edge.target }}</span>
              </div>
              <div
                v-if="edge.sourceHandle"
                class="info-row"
              >
                <span class="info-label">源端口</span>
                <span class="info-value">{{ edge.sourceHandle }}</span>
              </div>
              <div
                v-if="edge.targetHandle"
                class="info-row"
              >
                <span class="info-label">目标端口</span>
                <span class="info-value">{{ edge.targetHandle }}</span>
              </div>
            </div>
          </el-collapse-transition>
        </div>
      </div>
    </div>

    <!-- 节点编辑面板 -->
    <div
      v-else
      class="config-content"
    >
      <!-- 节点头部 -->
      <div class="panel-header">
        <div class="header-left">
          <span
            class="node-type-badge"
            :class="`type-${node.type}`"
          >
            {{ node.type?.toUpperCase() || 'NODE' }}
          </span>
          <span class="node-id">ID: {{ node.id.slice(0, 8) }}</span>
        </div>
        <el-button
          link
          type="danger"
          :icon="Delete"
          @click="$emit('delete', node.id)"
        />
      </div>

      <div class="config-sections">
        <!-- 基本信息 -->
        <div class="section">
          <div
            class="section-header"
            @click="toggleSection('basic')"
          >
            <span class="section-title">基本信息</span>
            <el-icon
              class="toggle-icon"
              :class="{ expanded: expandedSections.basic }"
            >
              <ArrowRight />
            </el-icon>
          </div>
          <el-collapse-transition>
            <div
              v-show="expandedSections.basic"
              class="section-content"
            >
              <el-form
                label-position="top"
                size="default"
              >
                <el-form-item label="节点名称">
                  <el-input
                    :model-value="node.data?.label"
                    placeholder="输入节点名称"
                    @input="$emit('update', node.id, { label: $event })"
                  />
                </el-form-item>
                <el-form-item label="节点描述">
                  <el-input
                    type="textarea"
                    :rows="2"
                    :model-value="node.data?.description"
                    placeholder="描述节点功能（可选）"
                    @input="$emit('update', node.id, { description: $event })"
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-collapse-transition>
        </div>

        <!-- 节点配置 -->
        <div class="section">
          <div
            class="section-header"
            @click="toggleSection('config')"
          >
            <span class="section-title">节点配置</span>
            <el-icon
              class="toggle-icon"
              :class="{ expanded: expandedSections.config }"
            >
              <ArrowRight />
            </el-icon>
          </div>
          <el-collapse-transition>
            <div
              v-show="expandedSections.config"
              class="section-content"
            >
              <el-form
                label-position="top"
                size="default"
              >
                <!-- LLM Specific -->
                <template v-if="isLLM">
                  <el-form-item label="模型选择">
                    <el-select
                      :model-value="node.data?.model || 'deepseek-chat'"
                      style="width: 100%"
                      @update:model-value="$emit('update', node.id, { model: $event })"
                    >
                      <el-option
                        label="DeepSeek Chat"
                        value="deepseek-chat"
                      />
                      <el-option
                        label="GPT-3.5 Turbo"
                        value="gpt-3.5-turbo"
                      />
                      <el-option
                        label="GPT-4"
                        value="gpt-4"
                      />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="系统提示词">
                    <el-input
                      type="textarea"
                      :rows="4"
                      :model-value="node.data?.systemPrompt"
                      placeholder="你是一个专业的AI助手..."
                      @input="$emit('update', node.id, { systemPrompt: $event })"
                    />
                  </el-form-item>
                  <el-form-item label="温度 (Temperature)">
                    <el-slider
                      :model-value="node.data?.temperature || 0.7"
                      :min="0"
                      :max="2"
                      :step="0.1"
                      show-input
                      @update:model-value="$emit('update', node.id, { temperature: $event })"
                    />
                  </el-form-item>
                </template>

                <!-- Knowledge Specific -->
                <template v-if="isKnowledge">
                  <el-form-item label="知识库">
                    <el-select
                      placeholder="选择知识库"
                      :model-value="node.data?.dataset || 'default'"
                      style="width: 100%"
                      @update:model-value="$emit('update', node.id, { dataset: $event })"
                    >
                      <el-option
                        label="默认知识库"
                        value="default"
                      />
                      <el-option
                        label="公司规章制度"
                        value="doc-1"
                      />
                      <el-option
                        label="产品技术文档"
                        value="doc-2"
                      />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="召回数量 (TopK)">
                    <el-input-number
                      :model-value="node.data?.topK || 3"
                      :min="1"
                      :max="10"
                      style="width: 100%"
                      @update:model-value="$emit('update', node.id, { topK: $event })"
                    />
                  </el-form-item>
                  <el-form-item label="相似度阈值">
                    <el-slider
                      :model-value="node.data?.scoreThreshold || 0.7"
                      :min="0"
                      :max="1"
                      :step="0.05"
                      show-input
                      @update:model-value="$emit('update', node.id, { scoreThreshold: $event })"
                    />
                  </el-form-item>
                </template>

                <!-- Condition Specific -->
                <template v-if="isCondition">
                  <el-form-item label="判断条件">
                    <el-input
                      type="textarea"
                      :rows="3"
                      placeholder="例如: input.includes('error')"
                      :model-value="node.data?.expression"
                      @input="$emit('update', node.id, { expression: $event })"
                    />
                  </el-form-item>
                  <el-alert
                    type="info"
                    :closable="false"
                    show-icon
                  >
                    <template #default>
                      <div class="tip-content">
                        支持 JavaScript 表达式，返回 true/false
                      </div>
                    </template>
                  </el-alert>
                </template>

                <!-- Code Specific -->
                <template v-if="isCode">
                  <el-form-item label="代码逻辑">
                    <el-input
                      type="textarea"
                      :rows="8"
                      placeholder="// JavaScript 代码&#10;return { result: 'ok' }"
                      :model-value="node.data?.code"
                      class="code-editor"
                      @input="$emit('update', node.id, { code: $event })"
                    />
                  </el-form-item>
                </template>

                <!-- End Specific -->
                <template v-if="isEnd">
                  <el-form-item label="输出变量名">
                    <el-input
                      placeholder="result"
                      :model-value="node.data?.outputVar || 'result'"
                      @input="$emit('update', node.id, { outputVar: $event })"
                    />
                  </el-form-item>
                </template>

                <!-- Trigger Specific -->
                <template v-if="isTrigger">
                  <el-alert
                    type="success"
                    :closable="false"
                  >
                    <template #default>
                      <div class="tip-content">
                        <el-icon><InfoFilled /></el-icon>
                        <span>工作流的起始节点，接收外部输入</span>
                      </div>
                    </template>
                  </el-alert>
                </template>

                <!-- HTTP Specific -->
                <template v-if="isHttp">
                  <el-form-item label="请求方法">
                    <el-select
                      :model-value="node.data?.method || 'GET'"
                      style="width: 100%"
                      @update:model-value="$emit('update', node.id, { method: $event })"
                    >
                      <el-option
                        label="GET"
                        value="GET"
                      />
                      <el-option
                        label="POST"
                        value="POST"
                      />
                      <el-option
                        label="PUT"
                        value="PUT"
                      />
                      <el-option
                        label="DELETE"
                        value="DELETE"
                      />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="请求 URL">
                    <el-input
                      :model-value="node.data?.url"
                      placeholder="https://api.example.com/endpoint"
                      @input="$emit('update', node.id, { url: $event })"
                    />
                  </el-form-item>
                  <el-form-item label="请求头 (Headers)">
                    <el-input
                      type="textarea"
                      :rows="3"
                      :model-value="node.data?.headers"
                      placeholder="{&quot;Content-Type&quot;: &quot;application/json&quot;}"
                      @input="$emit('update', node.id, { headers: $event })"
                    />
                  </el-form-item>
                  <el-form-item
                    v-if="node.data?.method !== 'GET'"
                    label="请求体 (Body)"
                  >
                    <el-input
                      type="textarea"
                      :rows="4"
                      :model-value="node.data?.body"
                      placeholder="{&quot;key&quot;: &quot;value&quot;}"
                      @input="$emit('update', node.id, { body: $event })"
                    />
                  </el-form-item>
                  <el-form-item label="超时时间 (ms)">
                    <el-input-number
                      :model-value="node.data?.timeout || 30000"
                      :min="1000"
                      :max="300000"
                      :step="1000"
                      style="width: 100%"
                      @update:model-value="$emit('update', node.id, { timeout: $event })"
                    />
                  </el-form-item>
                </template>
              </el-form>
            </div>
          </el-collapse-transition>
        </div>

        <!-- 输入变量 -->
        <div
          v-if="!isTrigger"
          class="section"
        >
          <div
            class="section-header"
            @click="toggleSection('input')"
          >
            <span class="section-title">输入变量</span>
            <el-badge
              :value="(node.data?.inputs || []).length"
              :hidden="(node.data?.inputs || []).length === 0"
              type="primary"
              class="section-badge"
            />
            <el-icon
              class="toggle-icon"
              :class="{ expanded: expandedSections.input }"
            >
              <ArrowRight />
            </el-icon>
          </div>
          <el-collapse-transition>
            <div
              v-show="expandedSections.input"
              class="section-content"
            >
              <div class="var-list">
                <div
                  v-for="(item, index) in (node.data?.inputs || [])"
                  :key="index"
                  class="var-item"
                >
                  <el-input 
                    v-model="item.name" 
                    placeholder="变量名" 
                    size="small" 
                    class="var-name"
                    @change="$emit('update', node.id, { inputs: [...(node.data?.inputs || [])] })"
                  />
                  <el-select 
                    v-model="item.type" 
                    placeholder="类型" 
                    size="small" 
                    class="var-type"
                    @change="$emit('update', node.id, { inputs: [...(node.data?.inputs || [])] })"
                  >
                    <el-option
                      label="String"
                      value="string"
                    />
                    <el-option
                      label="Number"
                      value="number"
                    />
                    <el-option
                      label="Boolean"
                      value="boolean"
                    />
                    <el-option
                      label="Object"
                      value="object"
                    />
                    <el-option
                      label="Array"
                      value="array"
                    />
                  </el-select>
                  <el-button 
                    link 
                    type="danger" 
                    :icon="Delete" 
                    class="var-delete"
                    @click="() => {
                      const newInputs = [...(node.data?.inputs || [])]
                      newInputs.splice(index, 1)
                      $emit('update', node.id, { inputs: newInputs })
                    }" 
                  />
                </div>
              </div>
              <el-button 
                class="add-btn" 
                size="small" 
                @click="() => {
                  const newInputs = [...(node.data?.inputs || []), { name: 'variable', type: 'string' }]
                  $emit('update', node.id, { inputs: newInputs })
                }"
              >
                + 添加输入变量
              </el-button>
            </div>
          </el-collapse-transition>
        </div>

        <!-- 输出变量 -->
        <div
          v-if="!isEnd"
          class="section"
        >
          <div
            class="section-header"
            @click="toggleSection('output')"
          >
            <span class="section-title">输出变量</span>
            <el-badge
              :value="(node.data?.outputs || []).length"
              :hidden="(node.data?.outputs || []).length === 0"
              type="success"
              class="section-badge"
            />
            <el-icon
              class="toggle-icon"
              :class="{ expanded: expandedSections.output }"
            >
              <ArrowRight />
            </el-icon>
          </div>
          <el-collapse-transition>
            <div
              v-show="expandedSections.output"
              class="section-content"
            >
              <div class="var-list">
                <div
                  v-for="(item, index) in (node.data?.outputs || [])"
                  :key="index"
                  class="var-item"
                >
                  <el-input 
                    v-model="item.name" 
                    placeholder="变量名" 
                    size="small" 
                    class="var-name"
                    @change="$emit('update', node.id, { outputs: [...(node.data?.outputs || [])] })"
                  />
                  <el-select 
                    v-model="item.type" 
                    placeholder="类型" 
                    size="small" 
                    class="var-type"
                    @change="$emit('update', node.id, { outputs: [...(node.data?.outputs || [])] })"
                  >
                    <el-option
                      label="String"
                      value="string"
                    />
                    <el-option
                      label="Number"
                      value="number"
                    />
                    <el-option
                      label="Boolean"
                      value="boolean"
                    />
                    <el-option
                      label="Object"
                      value="object"
                    />
                    <el-option
                      label="Array"
                      value="array"
                    />
                  </el-select>
                  <el-button 
                    link 
                    type="danger" 
                    :icon="Delete" 
                    class="var-delete"
                    @click="() => {
                      const newOutputs = [...(node.data?.outputs || [])]
                      newOutputs.splice(index, 1)
                      $emit('update', node.id, { outputs: newOutputs })
                    }" 
                  />
                </div>
              </div>
              <el-button 
                class="add-btn" 
                size="small" 
                @click="() => {
                  const newOutputs = [...(node.data?.outputs || []), { name: 'result', type: 'string' }]
                  $emit('update', node.id, { outputs: newOutputs })
                }"
              >
                + 添加输出变量
              </el-button>
            </div>
          </el-collapse-transition>
        </div>

        <!-- 错误处理 -->
        <div class="section">
          <div
            class="section-header"
            @click="toggleSection('error')"
          >
            <span class="section-title">错误处理</span>
            <el-icon
              class="toggle-icon"
              :class="{ expanded: expandedSections.error }"
            >
              <ArrowRight />
            </el-icon>
          </div>
          <el-collapse-transition>
            <div
              v-show="expandedSections.error"
              class="section-content"
            >
              <el-form
                label-position="top"
                size="default"
              >
                <el-form-item label="失败时">
                  <el-select
                    :model-value="node.data?.onError || 'stop'"
                    style="width: 100%"
                    @update:model-value="$emit('update', node.id, { onError: $event })"
                  >
                    <el-option
                      label="停止执行"
                      value="stop"
                    />
                    <el-option
                      label="继续执行"
                      value="continue"
                    />
                    <el-option
                      label="重试"
                      value="retry"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item
                  v-if="node.data?.onError === 'retry'"
                  label="重试次数"
                >
                  <el-input-number
                    :model-value="node.data?.retryCount || 3"
                    :min="1"
                    :max="10"
                    style="width: 100%"
                    @update:model-value="$emit('update', node.id, { retryCount: $event })"
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-collapse-transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.properties-panel {
  width: 100%;
  height: 100%;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  gap: 12px;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  color: #dcdfe6;
}

.empty-text {
  font-size: 13px;
  color: #909399;
}

.config-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-type-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  background: #e4e7ed;
  color: #606266;
}

.node-type-badge.type-trigger {
  background: #fef0c7;
  color: #f59e0b;
}

.node-type-badge.type-llm {
  background: #f1f5f9;
  color: #0ea5e9;
}

.node-type-badge.type-knowledge {
  background: #d1fae5;
  color: #10b981;
}

.node-type-badge.type-condition {
  background: #ede9fe;
  color: #8b5cf6;
}

.node-type-badge.type-code {
  background: #e0e7ff;
  color: #6366f1;
}

.node-type-badge.type-end {
  background: #fee2e2;
  color: #ef4444;
}

.node-type-badge.type-edge {
  background: #e0f2fe;
  color: #0284c7;
  display: flex;
  align-items: center;
  gap: 4px;
}

.node-type-badge.type-http {
  background: #ede9fe;
  color: #667eea;
}

.node-id {
  font-size: 11px;
  color: #909399;
  font-family: 'JetBrains Mono', Consolas, monospace;
}

.config-sections {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.section {
  border-bottom: 1px solid #f0f0f0;
}

.section:last-child {
  border-bottom: none;
}

.section-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.section-header:hover {
  background: #f5f7fa;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.section-badge {
  margin-right: 8px;
}

.toggle-icon {
  font-size: 14px;
  color: #909399;
  transition: transform 0.3s;
}

.toggle-icon.expanded {
  transform: rotate(90deg);
}

.section-content {
  padding: 0 16px 16px;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-form-item__label) {
  font-size: 12px !important;
  color: #606266 !important;
  font-weight: 500;
  margin-bottom: 8px;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  font-size: 13px;
}

.code-editor :deep(textarea) {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  background: #f8fafc;
}

.tip-content {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

:deep(.el-alert) {
  padding: 8px 12px;
  margin-top: 8px;
}

:deep(.el-alert__content) {
  padding: 0;
}

:deep(.el-empty) {
  padding: 20px 0;
}

:deep(.el-empty__description) {
  font-size: 12px;
  color: #909399;
}

/* 滚动条样式 */
.config-sections::-webkit-scrollbar {
  width: 6px;
}

.config-sections::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.config-sections::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}

.config-sections::-webkit-scrollbar-track {
  background: transparent;
}

.var-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.var-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.var-name {
  flex: 1;
  min-width: 0;
}

.var-type {
  width: 85px !important;
  flex-shrink: 0;
}

.var-delete {
  padding: 4px;
  margin-left: 2px;
}

.add-btn {
  width: 100%;
  border-style: dashed !important;
  color: #606266;
  font-weight: normal;
}

.add-btn:hover {
  color: var(--color-primary-500);
  border-color: var(--color-primary-300) !important;
  background: var(--color-primary-50) !important;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 12px;
  color: #909399;
}

.info-value {
  font-size: 12px;
  color: #303133;
  font-family: 'JetBrains Mono', Consolas, monospace;
}
</style>
