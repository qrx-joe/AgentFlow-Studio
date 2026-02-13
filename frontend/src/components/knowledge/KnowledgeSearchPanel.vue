<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  searchQuery: string
  topK: number
  scoreThreshold: number
  hybrid: boolean
  rerank: boolean
  vectorWeight: number
  keywordWeight: number
  keywordMode: 'bm25' | 'tsrank' | 'trgm'
  searching: boolean
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void
  (e: 'update:topK', value: number): void
  (e: 'update:scoreThreshold', value: number): void
  (e: 'update:hybrid', value: boolean): void
  (e: 'update:rerank', value: boolean): void
  (e: 'update:vectorWeight', value: number): void
  (e: 'update:keywordWeight', value: number): void
  (e: 'update:keywordMode', value: 'bm25' | 'tsrank' | 'trgm'): void
  (e: 'search'): void
}>()

const showAdvanced = ref(false)

const onSearch = () => {
  if (!props.searchQuery.trim()) return
  emit('search')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    onSearch()
  }
}

// 预设配置
const presets = [
  {
    name: '精确匹配',
    icon: '🎯',
    config: { hybrid: false, rerank: false, scoreThreshold: 0.7, topK: 3 }
  },
  {
    name: '混合检索',
    icon: '🔀',
    config: { hybrid: true, rerank: false, scoreThreshold: 0.5, topK: 5 }
  },
  {
    name: '智能重排',
    icon: '⚡',
    config: { hybrid: true, rerank: true, scoreThreshold: 0.3, topK: 10 }
  }
]

const applyPreset = (preset: typeof presets[0]) => {
  emit('update:hybrid', preset.config.hybrid)
  emit('update:rerank', preset.config.rerank)
  emit('update:scoreThreshold', preset.config.scoreThreshold)
  emit('update:topK', preset.config.topK)
}
</script>

<template>
  <div class="search-panel">
    <!-- 主搜索区 -->
    <div class="search-main">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <textarea
          :value="props.searchQuery"
          placeholder="输入你的问题，按 Enter 搜索..."
          class="search-textarea"
          rows="1"
          @input="(e) => emit('update:searchQuery', (e.target as HTMLTextAreaElement).value)"
          @keydown="handleKeydown"
        />
        <el-button
          type="primary"
          :loading="props.searching"
          :disabled="!props.searchQuery.trim()"
          class="search-btn"
          @click="onSearch"
        >
          {{ props.searching ? '检索中...' : '搜索' }}
        </el-button>
      </div>
    </div>

    <!-- 快速配置 -->
    <div class="quick-config">
      <div class="presets">
        <button
          v-for="preset in presets"
          :key="preset.name"
          class="preset-btn"
          @click="applyPreset(preset)"
        >
          <span class="preset-icon">{{ preset.icon }}</span>
          <span class="preset-name">{{ preset.name }}</span>
        </button>
      </div>

      <div class="basic-params">
        <div class="param-item">
          <label class="param-label">返回数量</label>
          <el-input-number
            :model-value="props.topK"
            :min="1"
            :max="20"
            size="small"
            controls-position="right"
            @update:model-value="(value: number | undefined) => emit('update:topK', Number(value))"
          />
        </div>

        <div class="param-item">
          <label class="param-label">相似度阈值</label>
          <el-slider
            :model-value="props.scoreThreshold"
            :min="0"
            :max="1"
            :step="0.05"
            :show-tooltip="true"
            :format-tooltip="(val: number) => val.toFixed(2)"
            style="width: 120px"
            @update:model-value="(value: number) => emit('update:scoreThreshold', value)"
          />
          <span class="param-value">{{ props.scoreThreshold.toFixed(2) }}</span>
        </div>

        <div class="param-item">
          <el-switch
            :model-value="props.hybrid"
            active-text="混合检索"
            inactive-text="向量检索"
            @update:model-value="(value: boolean) => emit('update:hybrid', value)"
          />
        </div>

        <div class="param-item">
          <el-switch
            :model-value="props.rerank"
            active-text="重排序"
            @update:model-value="(value: boolean) => emit('update:rerank', value)"
          />
        </div>
      </div>

      <button class="advanced-toggle" @click="showAdvanced = !showAdvanced">
        <span>{{ showAdvanced ? '收起' : '高级设置' }}</span>
        <span class="toggle-icon">{{ showAdvanced ? '▲' : '▼' }}</span>
      </button>
    </div>

    <!-- 高级设置 -->
    <div v-if="showAdvanced" class="advanced-panel">
      <div class="advanced-section">
        <h4 class="section-title">权重配置</h4>
        <div class="weight-controls">
          <div class="weight-item">
            <label class="weight-label">
              <span class="label-icon">🎯</span>
              向量权重
            </label>
            <el-slider
              :model-value="props.vectorWeight"
              :min="0"
              :max="2"
              :step="0.1"
              :show-tooltip="true"
              :format-tooltip="(val: number) => val.toFixed(1)"
              @update:model-value="(value: number) => emit('update:vectorWeight', value)"
            />
            <span class="weight-value">{{ props.vectorWeight.toFixed(1) }}</span>
          </div>

          <div class="weight-item">
            <label class="weight-label">
              <span class="label-icon">🔤</span>
              关键词权重
            </label>
            <el-slider
              :model-value="props.keywordWeight"
              :min="0"
              :max="2"
              :step="0.1"
              :show-tooltip="true"
              :format-tooltip="(val: number) => val.toFixed(1)"
              @update:model-value="(value: number) => emit('update:keywordWeight', value)"
            />
            <span class="weight-value">{{ props.keywordWeight.toFixed(1) }}</span>
          </div>
        </div>
      </div>

      <div class="advanced-section">
        <h4 class="section-title">关键词算法</h4>
        <div class="keyword-modes">
          <button
            v-for="mode in [
              { value: 'bm25', label: 'BM25', desc: '经典概率检索模型' },
              { value: 'tsrank', label: 'TS Rank', desc: 'PostgreSQL 全文检索' },
              { value: 'trgm', label: 'Trigram', desc: '三元组相似度' }
            ]"
            :key="mode.value"
            class="mode-btn"
            :class="{ active: props.keywordMode === mode.value }"
            @click="emit('update:keywordMode', mode.value as any)"
          >
            <div class="mode-label">{{ mode.label }}</div>
            <div class="mode-desc">{{ mode.desc }}</div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-panel {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* 主搜索区 */
.search-main {
  margin-bottom: 16px;
}

.search-input-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;
}

.search-input-wrapper:focus-within {
  border-color: var(--color-primary-900);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.search-icon {
  font-size: 20px;
  margin-top: 2px;
  opacity: 0.5;
}

.search-textarea {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  line-height: 1.5;
  resize: none;
  min-height: 24px;
  max-height: 120px;
  font-family: inherit;
}

.search-btn {
  flex-shrink: 0;
  height: 36px;
  padding: 0 20px;
  border-radius: 8px;
  font-weight: 500;
}

/* 快速配置 */
.quick-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.preset-btn:hover {
  background: #e5e7eb;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.preset-icon {
  font-size: 16px;
}

.preset-name {
  font-weight: 500;
  color: #374151;
}

.basic-params {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.param-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.param-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
}

.param-value {
  font-size: 13px;
  color: var(--color-primary-900);
  font-weight: 600;
  min-width: 36px;
  text-align: center;
}

.advanced-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px;
  background: transparent;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #6b7280;
  transition: all 0.2s;
}

.advanced-toggle:hover {
  border-color: #9ca3af;
  color: #374151;
  background: #f9fafb;
}

.toggle-icon {
  font-size: 10px;
}

/* 高级设置 */
.advanced-panel {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.advanced-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.weight-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.weight-item {
  display: grid;
  grid-template-columns: 140px 1fr 50px;
  align-items: center;
  gap: 12px;
}

.weight-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}

.label-icon {
  font-size: 16px;
}

.weight-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary-900);
  text-align: center;
}

.keyword-modes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.mode-btn {
  padding: 12px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.mode-btn:hover {
  border-color: #d1d5db;
  background: #f3f4f6;
}

.mode-btn.active {
  border-color: var(--color-primary-900);
  background: #f1f5f9;
}

.mode-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}

.mode-desc {
  font-size: 12px;
  color: #6b7280;
}

/* 响应式 */
@media (max-width: 768px) {
  .basic-params {
    flex-direction: column;
    align-items: stretch;
  }

  .param-item {
    justify-content: space-between;
  }

  .weight-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .keyword-modes {
    grid-template-columns: 1fr;
  }
}
</style>
