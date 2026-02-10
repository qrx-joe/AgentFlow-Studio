<script setup lang="ts">
import { computed } from 'vue'
import { EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@vue-flow/core'

// 条件分支边：带箭头与端点标记
const props = defineProps<EdgeProps>()

const edgePathData = computed(() => {
  return getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  })
})

const strokeColor = computed(() => {
  const stroke = (props.style as any)?.stroke
  return typeof stroke === 'string' ? stroke : '#94a3b8'
})

const labelStyle = computed(() => (props.labelStyle || {}) as Record<string, any>)
const labelBgStyle = computed(() => (props.labelBgStyle || {}) as Record<string, any>)
</script>

<template>
  <g>
    <defs>
      <marker
        :id="`${id}-arrow`"
        markerWidth="10"
        markerHeight="10"
        refX="8"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" :fill="strokeColor" />
      </marker>
    </defs>

    <path
      :id="id"
      :class="['branch-edge', 'flow']"
      :d="edgePathData[0]"
      :style="style"
      :marker-end="`url(#${id}-arrow)`"
    />

    <!-- 端点标记 -->
    <circle :cx="sourceX" :cy="sourceY" r="4" :fill="strokeColor" />
    <circle :cx="targetX" :cy="targetY" r="4" :fill="strokeColor" />

    <!-- 标签 -->
    <EdgeLabelRenderer>
      <div
        v-if="label"
        class="edge-label"
        :style="{
          ...labelBgStyle,
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${edgePathData[1]}px, ${edgePathData[2]}px)`,
          padding: '2px 6px',
          borderRadius: '6px',
          fontSize: '12px',
        }"
      >
        <span :style="labelStyle">{{ label }}</span>
      </div>
    </EdgeLabelRenderer>
  </g>
</template>

<style scoped>
.branch-edge {
  stroke-width: 2;
  fill: none;
}

@keyframes flowDash {
  to {
    stroke-dashoffset: -20;
  }
}

.flow {
  stroke-dasharray: 6 6;
  animation: flowDash 1.2s linear infinite;
}

.edge-highlight {
  stroke-width: 3;
}

.edge-highlight.flow {
  animation-duration: 0.5s;
}

.edge-trail {
  stroke-opacity: 0.9;
}

.edge-compare {
  stroke: #64748b;
  stroke-dasharray: 2 4;
  opacity: 0.7;
}

.edge-label {
  pointer-events: none;
}
</style>
