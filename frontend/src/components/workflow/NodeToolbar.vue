<script setup lang="ts">
import {
  VideoPlay,
  Delete,
  Download,
  VideoPause,
  Aim
} from '@element-plus/icons-vue'

defineProps<{
  saving: boolean
  executing: boolean
  replaying: boolean
  replaySpeed: number
  replayProgress: number
  replayTotal: number
  preserveTrail: boolean
  compareLast: boolean
  snapshotOptions: any[]
  selectedSnapshotId: string
  applySnapshotMeta: boolean
  minimal?: boolean // New prop
}>()

const emit = defineEmits([
  'save', 'run', 'clear', 'restore', 
  'replay', 'stop-replay', 'seek-replay', 'clear-trail',
  'save-snapshot', 'delete-snapshot', 'rename-snapshot', 'clear-snapshots',
  'export-snapshot', 'export-all-snapshots', 'import-snapshot',
  'export-replay-script', 'export-replay-json', 'export-replay-txt',
  'update:replay-speed', 'update:preserve-trail', 'update:compare-last',
  'update:selected-snapshot-id', 'update:apply-snapshot-meta'
])
</script>

<template>
  <div class="toolbar-container glass-panel">
    <!-- Group 1: Core Actions -->
    <div v-if="!minimal" class="tool-group">
      <el-tooltip content="保存工作流 (Ctrl+S)" placement="bottom">
        <el-button type="primary" :loading="saving" circle @click="$emit('save')">
          <el-icon><Download /></el-icon> <!-- Using Download icon for save/export metaphor or check mark -->
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="运行工作流 (Ctrl+R)" placement="bottom">
        <el-button type="success" :loading="executing" circle @click="$emit('run')">
          <el-icon><VideoPlay /></el-icon>
        </el-button>
      </el-tooltip>
    </div>

    <div v-if="!minimal" class="divider"></div>

    <!-- Group 2: Canvas View -->
    <div class="tool-group">
      <el-tooltip content="恢复视角" placement="bottom">
        <el-button text circle @click="$emit('restore')">
          <el-icon><Aim /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="清空画布" placement="bottom">
        <el-button text circle @click="$emit('clear')">
          <el-icon><Delete /></el-icon>
        </el-button>
      </el-tooltip>
    </div>

    <!-- Group 3: Replay Control -->
    <div class="divider"></div>
    
    <div class="tool-group replay-group">
      <template v-if="!replaying">
        <el-tooltip content="回放执行记录" placement="bottom">
          <el-button text round @click="$emit('replay')">
            <el-icon class="mr-1"><VideoPlay /></el-icon> 回放
          </el-button>
        </el-tooltip>
      </template>
      
      <template v-else>
         <el-button type="danger" text circle @click="$emit('stop-replay')">
            <el-icon><VideoPause /></el-icon>
         </el-button>
         
         <div class="slider-box">
            <span class="label">进度</span>
            <el-slider 
                :model-value="replayProgress" 
                :max="replayTotal" 
                :step="1"
                :show-tooltip="false"
                @input="$emit('seek-replay', $event)" 
                style="width: 100px"
            />
         </div>
         
         <div class="slider-box">
            <span class="label">{{ replaySpeed }}x</span>
         </div>
      </template>
    </div>
    
    <!-- Snapshot & More (Simplified for UI Demo) -->
    <!-- You can add a Dropdown here for snapshots if needed -->
  </div>
</template>

<style scoped>
.toolbar-container {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  z-index: 10;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--color-neutral-200);
  margin: 0 8px;
}

.replay-group {
    min-width: 200px;
    justify-content: center;
}

.slider-box {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--color-neutral-600);
}

.mr-1 {
    margin-right: 4px;
}
</style>
