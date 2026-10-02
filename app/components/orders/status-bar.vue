<!-- components/orders/status-bar.vue -->
<template>
  <div
    class="flex items-center gap-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 h-8 shrink-0 text-[10px] overflow-hidden"
  >
    <div class="flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
      <span class="text-gray-500">Chờ khớp: <b class="text-gray-800 dark:text-gray-200">{{ stats.pending }}</b></span>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
      <span class="text-gray-500">Đã khớp: <b class="text-gray-800 dark:text-gray-200">{{ stats.filled }}</b></span>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
      <span class="text-gray-500">Đã hủy: <b class="text-gray-800 dark:text-gray-200">{{ stats.canceled }}</b></span>
    </div>
    <USeparator
      orientation="vertical"
      class="h-3"
    />
    <span class="text-gray-500">Mua <b class="text-emerald-500 font-semibold tabular-nums">{{ buyRatio }}%</b></span>
    <span class="text-gray-500">Bán <b class="text-red-500 font-semibold tabular-nums">{{ sellRatio }}%</b></span>
    <div class="flex-1" />
    <span class="text-gray-400 hidden md:block">
      Top biến động:
      <b class="text-red-500 ml-1">OGN/USDT -8,92% ↓</b>
      <b class="text-emerald-500 ml-2">FLOW/USDT +12,11% ↑</b>
      <b class="text-emerald-500 ml-2">ENU/USDT +6,90% ↑</b>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { useOrderStats } from '../../composables/orders/useOrderStats'

defineProps<{ buyRatio: string, sellRatio: string }>()

const { stats, start, stop, refresh } = useOrderStats()

onMounted(start)
onUnmounted(stop)

// Cho page gọi refresh ngay sau khi đặt/hủy lệnh (không chờ vòng poll 5s)
defineExpose({ refresh })
</script>
