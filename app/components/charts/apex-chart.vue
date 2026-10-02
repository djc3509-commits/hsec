<script setup lang="ts">
import type { ApexOptions } from 'apexcharts'

defineProps<{
  type: 'line' | 'area' | 'bar' | 'donut' | 'pie' | 'radar' | 'heatmap' | 'radialBar' | 'scatter' | 'bubble' | 'candlestick' | 'boxPlot' | 'rangeBar' | 'rangeArea' | 'treemap' | 'polarArea'
  options: ApexOptions
  series: ApexOptions['series']
  height?: number | string
  width?: number | string
}>()

// Lazy import — code-split: chunk apex chỉ load khi page wallets mount
const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts'))
</script>

<template>
  <ClientOnly>
    <component
      :is="VueApexCharts"
      v-bind="$attrs"
      :type="type"
      :options="options"
      :series="series"
      :height="height"
      :width="width"
    />
    <template #fallback>
      <div class="w-full h-full bg-default/50 animate-pulse rounded" />
    </template>
  </ClientOnly>
</template>
