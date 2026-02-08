<script setup lang="ts">
const props = defineProps<{
  form: {
    timeoutMs: number
    retryCount: number
    retryDelayMs: number
    onError: 'fail' | 'skip'
  }
}>()
</script>

<template>
  <div class="policy">
    <div class="title">执行策略</div>
    <el-form-item label="超时(ms)">
      <el-input-number v-model="props.form.timeoutMs" :min="0" :max="120000" :step="1000" />
    </el-form-item>
    <el-form-item label="重试次数">
      <el-input-number v-model="props.form.retryCount" :min="0" :max="5" :step="1" />
    </el-form-item>
    <el-form-item label="重试间隔">
      <el-input-number v-model="props.form.retryDelayMs" :min="0" :max="10000" :step="500" />
    </el-form-item>
    <el-form-item label="失败策略">
      <el-select v-model="props.form.onError" style="width: 140px">
        <el-option label="失败终止" value="fail" />
        <el-option label="失败跳过" value="skip" />
        <el-option label="回滚终止" value="rollback" />
        <el-option label="补偿终止" value="compensate" />
      </el-select>
    </el-form-item>
  </div>
</template>

<style scoped>
.policy {
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
  margin-top: 8px;
}

.title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
}
</style>
