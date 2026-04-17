<script setup lang="ts">
const props = defineProps<{
  form: {
    timeoutMs: number;
    retryCount: number;
    retryDelayMs: number;
    onError: 'fail' | 'skip' | 'rollback' | 'compensate';
    compensateKeys: string;
    compensationActionsText: string;
  };
}>();

const emit = defineEmits(['update:form']);
</script>

<template>
  <div class="policy">
    <div class="title">执行策略</div>
    <el-form-item label="超时(ms)">
      <el-input-number
        :model-value="props.form.timeoutMs"
        :min="0"
        :max="120000"
        :step="1000"
        @update:model-value="emit('update:form', { ...props.form, timeoutMs: $event })"
      />
    </el-form-item>
    <el-form-item label="重试次数">
      <el-input-number
        :model-value="props.form.retryCount"
        :min="0"
        :max="5"
        :step="1"
        @update:model-value="emit('update:form', { ...props.form, retryCount: $event })"
      />
    </el-form-item>
    <el-form-item label="重试间隔">
      <el-input-number
        :model-value="props.form.retryDelayMs"
        :min="0"
        :max="10000"
        :step="500"
        @update:model-value="emit('update:form', { ...props.form, retryDelayMs: $event })"
      />
    </el-form-item>
    <el-form-item label="失败策略">
      <el-select
        :model-value="props.form.onError"
        style="width: 140px"
        @update:model-value="emit('update:form', { ...props.form, onError: $event })"
      >
        <el-option label="失败终止" value="fail" />
        <el-option label="失败跳过" value="skip" />
        <el-option label="回滚终止" value="rollback" />
        <el-option label="补偿终止" value="compensate" />
      </el-select>
    </el-form-item>
    <el-form-item label="补偿变量">
      <el-input
        :model-value="props.form.compensateKeys"
        placeholder="变量Key，逗号分隔"
        @input="emit('update:form', { ...props.form, compensateKeys: $event })"
      />
    </el-form-item>
    <el-form-item label="补偿动作">
      <el-input
        :model-value="props.form.compensationActionsText"
        type="textarea"
        :rows="3"
        placeholder='JSON 数组，例如：[{"type":"log","message":"cleanup"}]'
        @input="emit('update:form', { ...props.form, compensationActionsText: $event })"
      />
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
