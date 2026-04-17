<script setup lang="ts">
import { ref } from 'vue';
import { knowledgeApi } from '@/api';
import KnowledgeEvalResults from '@/components/knowledge/KnowledgeEvalResults.vue';
const defaultPayload = `[
  {
    "query": "示例问题",
    "expectedDocumentIds": ["doc-id-1"]
  }
]`;
const queryText = ref(defaultPayload);
const topK = ref(3);
const baseline = ref({
  scoreThreshold: 0,
  hybrid: false,
  rerank: false,
  vectorWeight: 1,
  keywordWeight: 0,
  keywordMode: 'bm25' as 'bm25' | 'tsrank' | 'trgm',
});
const compare = ref({
  scoreThreshold: 0,
  hybrid: true,
  rerank: true,
  vectorWeight: 1,
  keywordWeight: 0.1,
  keywordMode: 'bm25' as 'bm25' | 'tsrank' | 'trgm',
});
const loading = ref(false);
const result = ref<any>(null);
const error = ref('');
const runEval = async () => {
  error.value = '';
  result.value = null;
  let queries: Array<{ query: string; expectedDocumentIds: string[] }> = [];
  try {
    queries = JSON.parse(queryText.value);
  } catch {
    error.value = '评测查询 JSON 解析失败';
    return;
  }
  if (!Array.isArray(queries) || queries.length === 0) {
    error.value = '请提供评测查询数组';
    return;
  }
  loading.value = true;
  try {
    result.value = await knowledgeApi.eval({
      queries,
      topK: topK.value,
      baseline: baseline.value,
      compare: compare.value,
    });
  } catch (e: any) {
    error.value = e?.message || '评测失败';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="panel">
    <div class="title">RAG 评测与对比</div>
    <div class="grid">
      <div class="block">
        <div class="block-title">评测查询 (JSON 数组)</div>
        <el-input v-model="queryText" type="textarea" :rows="8" />
        <div class="controls">
          <span class="label">TopK</span>
          <el-input-number v-model="topK" :min="1" :max="10" />
          <el-button type="primary" :loading="loading" @click="runEval"> 开始评测 </el-button>
        </div>
        <div v-if="error" class="error">
          {{ error }}
        </div>
      </div>

      <div class="block">
        <div class="block-title">Baseline 配置</div>
        <div class="row">
          <span class="label">threshold</span>
          <el-input-number v-model="baseline.scoreThreshold" :min="0" :max="1" :step="0.05" />
          <el-switch v-model="baseline.hybrid" active-text="混合" />
          <el-switch v-model="baseline.rerank" active-text="重排" />
        </div>
        <div class="row">
          <span class="label">vw</span>
          <el-input-number v-model="baseline.vectorWeight" :min="0" :max="2" :step="0.05" />
          <span class="label">kw</span>
          <el-input-number v-model="baseline.keywordWeight" :min="0" :max="2" :step="0.05" />
          <el-select v-model="baseline.keywordMode" style="width: 120px">
            <el-option label="BM25" value="bm25" />
            <el-option label="TS Rank" value="tsrank" />
            <el-option label="Trigram" value="trgm" />
          </el-select>
        </div>
      </div>

      <div class="block">
        <div class="block-title">Compare 配置</div>
        <div class="row">
          <span class="label">threshold</span>
          <el-input-number v-model="compare.scoreThreshold" :min="0" :max="1" :step="0.05" />
          <el-switch v-model="compare.hybrid" active-text="混合" />
          <el-switch v-model="compare.rerank" active-text="重排" />
        </div>
        <div class="row">
          <span class="label">vw</span>
          <el-input-number v-model="compare.vectorWeight" :min="0" :max="2" :step="0.05" />
          <span class="label">kw</span>
          <el-input-number v-model="compare.keywordWeight" :min="0" :max="2" :step="0.05" />
          <el-select v-model="compare.keywordMode" style="width: 120px">
            <el-option label="BM25" value="bm25" />
            <el-option label="TS Rank" value="tsrank" />
            <el-option label="Trigram" value="trgm" />
          </el-select>
        </div>
      </div>

      <div class="block">
        <div class="block-title">评测结果</div>
        <KnowledgeEvalResults :result="result" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: #ffffff;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.title {
  font-weight: 600;
  margin-bottom: 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.block {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
}

.block-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
}

.controls,
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.label {
  font-size: 12px;
  color: #64748b;
}

.error {
  margin-top: 8px;
  color: #b91c1c;
  font-size: 12px;
}
</style>
