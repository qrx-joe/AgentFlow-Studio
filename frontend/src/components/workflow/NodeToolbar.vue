<script setup lang="ts">
// 工具栏：保存、运行、清空
defineProps<{
  saving: boolean
  executing: boolean
  replaying: boolean
  replaySpeed: number
  replayProgress: number
  replayTotal: number
  preserveTrail: boolean
  compareLast: boolean
  snapshotOptions: Array<{ label: string; value: string }>
  selectedSnapshotId: string
}>()

defineEmits<{
  (e: 'save'): void
  (e: 'run'): void
  (e: 'clear'): void
  (e: 'restore'): void
  (e: 'replay'): void
  (e: 'stopReplay'): void
  (e: 'update:replaySpeed', value: number): void
  (e: 'seekReplay', value: number): void
  (e: 'update:preserveTrail', value: boolean): void
  (e: 'update:compareLast', value: boolean): void
  (e: 'clearTrail'): void
  (e: 'saveSnapshot'): void
  (e: 'update:selectedSnapshotId', value: string): void
  (e: 'deleteSnapshot'): void
  (e: 'renameSnapshot'): void
  (e: 'clearSnapshots'): void
  (e: 'exportSnapshot'): void
  (e: 'importSnapshot'): void
}>()
</script>

<template>
  <div class="toolbar">
    <el-button type="primary" :loading="saving" @click="$emit('save')">保存</el-button>
    <el-button type="success" :loading="executing" @click="$emit('run')">运行</el-button>
    <el-button @click="$emit('clear')">清空</el-button>
    <el-button @click="$emit('restore')">恢复视角</el-button>
    <el-button v-if="!replaying" @click="$emit('replay')">回放</el-button>
    <el-button v-else type="danger" @click="$emit('stopReplay')">停止回放</el-button>
    <div class="speed-control">
      <span class="speed-label">回放速度</span>
      <el-slider
        class="speed"
        :model-value="replaySpeed"
        :min="400"
        :max="2000"
        :step="200"
        :show-tooltip="true"
        @update:model-value="$emit('update:replaySpeed', $event)"
      />
      <span class="speed-value">{{ (replaySpeed / 1000).toFixed(1) }}s</span>
    </div>
    <div class="progress-control">
      <span class="progress-label">进度</span>
      <el-slider
        class="progress"
        :model-value="replayProgress"
        :min="0"
        :max="Math.max(replayTotal - 1, 0)"
        :step="1"
        :show-tooltip="true"
        @change="$emit('seekReplay', $event)"
      />
      <span class="progress-value">{{ replayTotal === 0 ? 0 : replayProgress + 1 }}/{{ replayTotal }}</span>
    </div>
    <div class="trail-control">
      <el-switch
        :model-value="preserveTrail"
        active-text="保留轨迹"
        @update:model-value="$emit('update:preserveTrail', $event)"
      />
      <el-switch
        :model-value="compareLast"
        active-text="对比上次"
        @update:model-value="$emit('update:compareLast', $event)"
      />
      <el-button size="small" @click="$emit('clearTrail')">清除轨迹</el-button>
      <el-button size="small" type="primary" @click="$emit('saveSnapshot')">保存快照</el-button>
      <el-select
        class="snapshot"
        :model-value="selectedSnapshotId"
        placeholder="选择快照"
        size="small"
        clearable
        @update:model-value="$emit('update:selectedSnapshotId', $event)"
      >
        <el-option
          v-for="option in snapshotOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-button size="small" @click="$emit('renameSnapshot')">重命名</el-button>
      <el-button size="small" type="danger" @click="$emit('deleteSnapshot')">删除</el-button>
      <el-button size="small" type="danger" plain @click="$emit('clearSnapshots')">清空</el-button>
      <el-button size="small" type="primary" plain @click="$emit('exportSnapshot')">导出</el-button>
      <el-button size="small" type="primary" plain @click="$emit('importSnapshot')">导入</el-button>
    </div>
    <el-button disabled>撤销</el-button>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.speed {
  width: 140px;
}

.speed-label {
  font-size: 12px;
  color: #64748b;
}

.speed-value {
  font-size: 12px;
  color: #334155;
}

.progress-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress {
  width: 160px;
}

.progress-label {
  font-size: 12px;
  color: #64748b;
}

.progress-value {
  font-size: 12px;
  color: #334155;
}

.trail-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.snapshot {
  width: 140px;
}
</style>
