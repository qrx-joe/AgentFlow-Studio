<script setup lang="ts">
// 工具栏：保存、运行、清空
defineProps<{
  saving: boolean
  executing: boolean
}>()

defineEmits<{
  (e: 'save'): void
  (e: 'run'): void
  (e: 'clear'): void
  (e: 'restore'): void
}>()
</script>

<template>
  <div class="toolbar">
    <el-button type="primary" :loading="saving" @click="$emit('save')">保存</el-button>
    <el-button type="success" :loading="executing" @click="$emit('run')">运行</el-button>
    <el-button @click="$emit('clear')">清空</el-button>
    <el-button @click="$emit('restore')">恢复视角</el-button>
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
</style>
