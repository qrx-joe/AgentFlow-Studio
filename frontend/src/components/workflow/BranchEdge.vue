<script setup lang="ts">
import { computed } from 'vue';
import { EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@vue-flow/core';

// 条件分支边：带箭头与端点标记
const props = defineProps<EdgeProps>();

const edgePathData = computed(() => {
  return getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  });
});

const strokeColor = computed(() => {
  if (props.selected) return '#0f172a'; // Brand Slate when selected
  const stroke = (props.style as any)?.stroke;
  return typeof stroke === 'string' ? stroke : '#cbd5e1'; // Slate-300 default
});

const strokeWidth = computed(() => (props.selected ? 3 : 2));
</script>

<template>
  <g class="edge-group" :class="{ selected }">
    <defs>
      <marker
        :id="`${id}-arrow`"
        markerWidth="12"
        markerHeight="12"
        refX="10"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" :fill="strokeColor" />
      </marker>
    </defs>

    <!-- Invisible wider path for easier selection -->
    <path
      :d="edgePathData[0]"
      stroke-width="20"
      stroke="transparent"
      fill="none"
      class="interaction-path"
    />

    <path
      :id="id"
      :class="['branch-edge', { flow: animated }]"
      :d="edgePathData[0]"
      :style="{
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        fill: 'none',
        ...((style as any) || {}),
      }"
      :marker-end="`url(#${id}-arrow)`"
    />

    <!-- 端点标记 -->
    <circle v-if="!selected" :cx="sourceX" :cy="sourceY" r="3" :fill="strokeColor" />
    <circle v-if="!selected" :cx="targetX" :cy="targetY" r="3" :fill="strokeColor" />

    <!-- 标签 -->
    <EdgeLabelRenderer>
      <div
        v-if="label"
        class="edge-label"
        :style="{
          ...labelBgStyle,
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${edgePathData[1]}px, ${edgePathData[2]}px)`,
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 500,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          color: '#64748b',
          zIndex: 10,
        }"
      >
        <span :style="labelStyle">{{ label }}</span>
      </div>
    </EdgeLabelRenderer>
  </g>
</template>

<style scoped>
.branch-edge {
  fill: none;
  transition: all 0.2s;
}

/* Particle Flow Animation */
@keyframes flowParticle {
  from {
    stroke-dashoffset: 24;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.flow {
  /* Create a dot pattern */
  stroke-dasharray: 4 4;
  animation: flowParticle 0.8s linear infinite;
}

.edge-label {
  pointer-events: all; /* Allow clicking label if needed */
  transition: all 0.2s;
}

.edge-group.selected .edge-label {
  border-color: var(--color-primary-900);
  color: var(--color-primary-900);
  box-shadow: 0 0 0 1px var(--color-primary-900);
}

.interaction-path {
  cursor: pointer;
}
</style>
