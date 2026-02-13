<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import {
  MoreFilled,
  Loading,
  Check,
  Close
} from '@element-plus/icons-vue'

const props = defineProps<{
  id?: string
  label: string
  icon?: any
  color?: string
  selected?: boolean
  inputs?: Array<{ id: string; label?: string }>
  outputs?: Array<{ id: string; label?: string }>
  status?: string
}>()

const headerStyle = computed(() => ({
  background: props.color ? `${props.color}15` : '#f8fafc',
  color: props.color || '#64748b'
}))

const iconStyle = computed(() => ({
  background: props.color || '#64748b',
  color: '#ffffff'
}))
</script>

<template>
  <div class="base-node" :class="{ selected: selected, running: status === 'running', failed: status === 'failed', success: status === 'success' }">
    <!-- Header -->
    <div class="node-header" :style="headerStyle">
      <div class="icon-box" :style="iconStyle">
        <component :is="icon" v-if="icon" />
      </div>
      <div class="node-title">{{ label }}
           <span v-if="status === 'running'" class="status-badge running"><el-icon class="is-loading"><Loading /></el-icon></span>
      </div>
      <div class="node-actions">
        <!-- Optional status icon -->
        <el-icon v-if="status === 'success'" color="#10b981"><Check /></el-icon>
        <el-icon v-if="status === 'failed'" color="#ef4444"><Close /></el-icon>
        <el-icon class="more-btn"><MoreFilled /></el-icon>
      </div>
    </div>

    <!-- Body -->
    <div class="node-body">
      <slot></slot>
    </div>

    <!-- Connection Handles (Dynamic) -->
    <!-- Inputs (Left) -->
    <div class="inputs">
        <Handle 
            type="target" 
            :position="Position.Left" 
            class="handle-input"
        />
    </div>

    <!-- Outputs (Right) -->
    <div class="outputs">
        <Handle 
            type="source" 
            :position="Position.Right" 
            class="handle-output"
        />
    </div>
  </div>
</template>

<style scoped>
.base-node {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid var(--color-neutral-200);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1);
  min-width: 240px;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
}

/* Hover Effect: Lift & Deeper Shadow */
.base-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-color: var(--color-primary-300);
  z-index: 10;
}

/* Selected State: Glow & Border */
.base-node.selected {
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.08), 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 20;
}

.base-node.running {
    border-color: var(--color-primary-900);
    box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.2);
}

.base-node.failed {
    border-color: #ef4444;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.base-node.success {
    border-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

/* Header */
.node-header {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 12px 12px 0 0;
  transition: background 0.2s;
}

.icon-box {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.node-title {
  font-size: 14px;
  font-weight: 600;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-badge {
    display: flex;
    align-items: center;
}

.node-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-neutral-400);
  opacity: 0;
  transition: opacity 0.2s;
}

.base-node:hover .node-actions {
  opacity: 1;
}

.more-btn {
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
}

.more-btn:hover {
    background: rgba(0,0,0,0.05);
    color: var(--color-neutral-900);
}

/* Body */
.node-body {
  padding: 12px;
  font-size: 13px;
  color: var(--color-neutral-600);
  line-height: 1.5;
}

/* Handles - Auto Hide */
:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  background: var(--color-neutral-400);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0; /* Hidden by default */
  transform: scale(0.5);
}

.base-node:hover :deep(.vue-flow__handle),
.base-node.selected :deep(.vue-flow__handle) {
    opacity: 1;
    transform: scale(1);
}

:deep(.vue-flow__handle:hover) {
    width: 14px;
    height: 14px;
    background: var(--color-primary-500);
    transform: scale(1.2);
    border-color: #ffffff;
}

:deep(.vue-flow__handle-left) {
    left: -6px;
}

:deep(.vue-flow__handle-right) {
    right: -6px;
}
</style>
