<template>
  <UCard
    variant="outline"
    class="w-full h-full flex flex-col overflow-hidden"
    :ui="{
      root: 'rounded-xl',
      header: 'px-4 py-3 sm:px-4',
      body: 'flex-1 relative min-h-0 p-0 sm:p-0'
    }"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <!-- Left: coin info -->
        <div class="flex items-center gap-2.5">
          <CoinIcon
            :symbol="baseSymbol"
            :icon="props.icon"
            :size="28"
          />
          <div class="flex flex-col leading-none gap-0.5">
            <span class="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight">
              {{ formatSymbol(props.symbol) }}
            </span>
          </div>
        </div>

        <!-- Right: timeframe pills -->
        <div class="flex items-center gap-1">
          <span
            v-for="tf in TIMEFRAMES"
            :key="tf"
            class="px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer transition-colors"
            :class="tf === interval
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
            @click="setTimeframe(tf)"
          >
            {{ tf }}
          </span>
        </div>
      </div>
    </template>

    <div class="absolute inset-0">
      <div
        ref="chartContainer"
        class="w-full h-full"
      />

      <!-- Loading overlay -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-300"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="loading"
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px] bg-white/60 dark:bg-gray-950/60"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="w-7 h-7 animate-spin text-gray-400"
          />
          <span class="text-xs text-gray-400 font-medium tracking-wide">Đang tải dữ liệu...</span>
        </div>
      </Transition>

      <!-- Error overlay -->
      <div
        v-if="error && !loading"
        class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/80 dark:bg-gray-950/80"
      >
        <UIcon
          name="i-lucide-triangle-alert"
          class="w-7 h-7 text-error"
        />
        <span class="text-xs text-error font-medium">{{ error }}</span>
        <button
          class="text-[11px] text-primary underline"
          @click="load"
        >
          Thử lại
        </button>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { createChart, ColorType, CandlestickSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import CoinIcon from '~/components/coins/CoinIcon.vue'
import type { KlineInterval } from '../../../server/dtos/kline'

const props = defineProps<{
  symbol: string // 'BTC' hoặc 'BTCUSDT' đều OK — composable tự strip
  icon?: string | null
}>()

// Strip USDT cho CoinIcon + composable
const baseSymbol = computed(() => props.symbol.toUpperCase().replace(/USDT$/, ''))

// ── State qua composables ────────────────────────────────────
const { candles, loading, error, interval, load, setTimeframe }
  = useKlineHistory(() => baseSymbol.value)

const { ticks, watchPair } = useKlineStream()

// Subscribe WS theo (symbol, interval) — tự release on unmount
watchPair(() => baseSymbol.value, interval)

// ── Lightweight Charts ──────────────────────────────────────
const TIMEFRAMES: KlineInterval[] = ['15m', '1h', '4h', '1d', '1w']
const VISIBLE_CANDLES = 100

const chartContainer = ref<HTMLElement | null>(null)
let chart: IChartApi | null = null
let candlestickSeries: ISeriesApi<'Candlestick'> | null = null
let resizeObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null

const colorMode = useColorMode()
const isDark = computed(() => colorMode.preference === 'dark')

function chartOptions(dark: boolean) {
  return {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: dark ? '#9CA3AF' : '#6B7280'
    },
    grid: {
      vertLines: { color: dark ? '#1F2937' : '#F3F4F6' },
      horzLines: { color: dark ? '#1F2937' : '#F3F4F6' }
    },
    crosshair: { mode: 1 },
    rightPriceScale: { borderColor: dark ? '#1F2937' : '#F3F4F6' },
    timeScale: {
      borderColor: dark ? '#1F2937' : '#F3F4F6',
      timeVisible: true,
      secondsVisible: false
    }
  }
}

function initChart() {
  if (!chartContainer.value) return
  chart = createChart(chartContainer.value as any, chartOptions(isDark.value))
  candlestickSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#10B981',
    downColor: '#EF4444',
    borderVisible: false,
    wickUpColor: '#10B981',
    wickDownColor: '#EF4444'
  })
}

// ── Reactive bridge: candles (REST) → setData ───────────────
watch(candles, (list) => {
  if (!candlestickSeries || !list.length) return
  // Candle đã đúng schema lightweight-charts (time/open/high/low/close)
  candlestickSeries.setData(list.map(c => ({
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close
  })))
  if (list.length > VISIBLE_CANDLES && chart) {
    chart.timeScale().setVisibleLogicalRange({
      from: list.length - VISIBLE_CANDLES,
      to: list.length - 1
    })
  }
})

// ── Reactive bridge: WS tick → series.update ────────────────
watch(ticks, (map) => {
  if (!candlestickSeries) return
  const tick = map.get(`${baseSymbol.value}@${interval.value}`)
  if (!tick) return
  candlestickSeries.update({
    time: tick.time as UTCTimestamp,
    open: tick.open,
    high: tick.high,
    low: tick.low,
    close: tick.close
  })
})

// Đổi symbol từ ngoài → reload (không cần :key="symbol" remount)
watch(() => baseSymbol.value, () => load())

// ── Lifecycle ────────────────────────────────────────────────
onMounted(() => {
  initChart()
  load()

  if (chartContainer.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0 && chart) chart.resize(width, height)
      }, 200)
    })
    resizeObserver.observe(chartContainer.value as any)
  }
})

onUnmounted(() => {
  if (resizeTimer) { clearTimeout(resizeTimer); resizeTimer = null }
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.remove()
  chart = null
  candlestickSeries = null
})

watch(isDark, d => chart?.applyOptions(chartOptions(d)))
</script>

<style scoped>
:deep(#tv-attr-logo) {
  display: none !important;
}
</style>
