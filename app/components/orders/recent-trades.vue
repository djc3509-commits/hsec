<!-- components/orders/recent-trades.vue -->
<template>
  <div
    class=" h-[400px] flex flex-col bg-white dark:bg-gray-900 rounded-xl ring-1 ring-gray-200/60 dark:ring-gray-800/60 overflow-hidden shadow-sm"
  >
    <div
      class="flex items-center justify-between px-2.5 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0"
    >
      <span class="text-[11px] font-semibold text-gray-800 dark:text-white">Giao dịch gần đây</span>
      <UButton
        color="primary"
        variant="link"
        label="Của tôi"
        size="xs"
        :padded="false"
        class="text-[10px] font-semibold"
      />
    </div>

    <div
      class="grid grid-cols-3 px-2.5 py-1 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 shrink-0"
    >
      <span class="text-[9px] font-bold text-gray-400 uppercase">Giá</span>
      <span class="text-[9px] font-bold text-gray-400 uppercase text-center">KL</span>
      <span class="text-[9px] font-bold text-gray-400 uppercase text-right">TG</span>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-hide min-h-0">
      <div
        v-if="trades.length === 0"
        class="flex flex-col items-center justify-center h-full gap-1.5 py-6"
      >
        <UIcon
          name="i-heroicons-clock"
          class="w-5 h-5 text-gray-300 dark:text-gray-600"
        />
        <span class="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Chưa có giao dịch khớp</span>
      </div>
      <div
        v-for="(t, i) in trades"
        :key="i"
        class="grid grid-cols-3 px-2.5 py-0.75 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
      >
        <span
          class="text-[11px] font-semibold tabular-nums"
          :class="t.side === 'buy' ? 'text-emerald-500' : 'text-red-500'"
        >{{ t.p }}</span>
        <span class="text-center text-[11px] text-gray-500 dark:text-gray-400 font-medium tabular-nums">{{ t.q }}</span>
        <span class="text-right text-[11px] text-gray-400 dark:text-gray-500">{{ t.time }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRecentTrades } from '../../composables/orders/useRecentTrades'

const props = defineProps<{ symbol: string }>()
const symbol = toRef(props, 'symbol')

const { trades, start, stop, refresh } = useRecentTrades(symbol)

onMounted(start)
onUnmounted(stop)

defineExpose({ refresh })
</script>
