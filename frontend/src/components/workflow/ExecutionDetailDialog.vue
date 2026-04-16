<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  execution: any
  formattedExecutionInput: string
  formattedExecutionOutput: string
  executionLogGroups: Array<{ title: string; items: Array<{ text: string; nodeId?: string }> }>
  collapsedGroups: Set<number>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'toggle-group', index: number): void
  (e: 'select-node', nodeId: string): void
  (e: 'copy'): void
  (e: 'download-logs'): void
  (e: 'replay'): void
  (e: 'export-script'): void
  (e: 'export-json'): void
  (e: 'export-txt'): void
}>()
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    title="执行详情"
    width="720px"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div
      v-if="props.execution"
      class="execution-detail"
    >
      <div class="section">
        <div class="label">
          状态
        </div>
        <div class="value">
          {{ props.execution.status }}
        </div>
      </div>
      <div class="section">
        <div class="label">
          开始时间
        </div>
        <div class="value">
          {{ props.execution.startedAt }}
        </div>
      </div>
      <div
        v-if="props.execution.completedAt"
        class="section"
      >
        <div class="label">
          结束时间
        </div>
        <div class="value">
          {{ props.execution.completedAt }}
        </div>
      </div>
      <div
        v-if="props.execution.errorMessage"
        class="section"
      >
        <div class="label">
          错误信息
        </div>
        <div class="value error">
          {{ props.execution.errorMessage }}
        </div>
      </div>

      <div
        v-if="props.formattedExecutionInput"
        class="section"
      >
        <div class="label">
          输入
        </div>
        <pre class="code">{{ props.formattedExecutionInput }}</pre>
      </div>
      <div
        v-if="props.formattedExecutionOutput"
        class="section"
      >
        <div class="label">
          输出
        </div>
        <pre class="code">{{ props.formattedExecutionOutput }}</pre>
      </div>
      <div
        v-if="props.execution.logs?.length"
        class="section"
      >
        <div class="label">
          日志
        </div>
        <div class="log-list">
          <div
            v-for="(group, gIndex) in props.executionLogGroups"
            :key="gIndex"
            class="group"
          >
            <div
              class="group-header"
              @click="emit('toggle-group', gIndex)"
            >
              <span class="group-title">{{ group.title }}</span>
              <span class="group-toggle">
                {{ props.collapsedGroups.has(gIndex) ? '展开' : '折叠' }}
              </span>
            </div>
            <div v-if="!props.collapsedGroups.has(gIndex)">
              <div
                v-if="group.items.length === 0"
                class="log-item muted"
              >
                无额外信息
              </div>
              <div
                v-for="(line, index) in group.items"
                :key="index"
                class="log-item"
                :class="{ clickable: line.nodeId }"
                @click="line.nodeId && emit('select-node', line.nodeId)"
              >
                {{ line.text }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="actions">
        <el-button @click="emit('copy')">
          复制详情
        </el-button>
        <el-button
          type="primary"
          @click="emit('download-logs')"
        >
          下载日志
        </el-button>
        <el-button
          type="success"
          @click="emit('replay')"
        >
          回放该记录
        </el-button>
        <el-button
          type="primary"
          plain
          @click="emit('export-script')"
        >
          导出脚本
        </el-button>
        <el-button @click="emit('export-json')">
          导出 JSON
        </el-button>
        <el-button @click="emit('export-txt')">
          导出 TXT
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.execution-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section {
  display: flex;
  gap: 12px;
}

.label {
  width: 80px;
  font-weight: 600;
  color: #334155;
}

.value {
  color: #0f172a;
}

.value.error {
  color: #b91c1c;
}

.code {
  background: #0f172a;
  color: #e2e8f0;
  padding: 10px;
  border-radius: 8px;
  width: 100%;
  overflow: auto;
  font-size: 12px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  font-size: 12px;
  color: #64748b;
}

.group-title {
  font-weight: 600;
}

.group-toggle {
  color: #38bdf8;
}

.log-item {
  font-size: 12px;
  color: #334155;
  padding: 4px 0;
}

.log-item.muted {
  color: #94a3b8;
}

.log-item.clickable {
  cursor: pointer;
  color: #0ea5e9;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
</style>
