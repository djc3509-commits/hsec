<template>
  <div
    class="bg-white dark:bg-[#14141c] ring-1 ring-slate-200 dark:ring-white/5 rounded-2xl shadow-sm flex flex-col min-h-[360px]"
  >
    <div class="p-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-transparent">
      <h3 class="font-bold text-slate-700 dark:text-white text-base">
        Tâm lý thị trường
      </h3>
      <p class="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
        Tỉ lệ Mua / Bán · {{ fullLabel }}
      </p>
    </div>

    <div class="p-6 flex-1 flex flex-col justify-center items-center gap-6">
      <!-- Gauge -->
      <div class="relative w-full max-w-[200px] h-[100px]">
        <canvas
          ref="canvasRef"
          class="w-full h-full"
        />
        <!-- Score overlay -->
        <div class="absolute bottom-0 left-0 w-full text-center flex flex-col items-center pointer-events-none pb-1">
          <span
            class="text-3xl font-semibold leading-none mb-1 tabular-nums"
            :style="{ color: scoreColor }"
          >
            {{ sentiment?.score ?? '--' }}
          </span>
          <span class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
            {{ sentimentLabel }}
          </span>
        </div>
      </div>

      <!-- Stats -->
      <div class="w-full text-[11px] text-slate-400 text-center">
        <template v-if="sentiment">
          {{ sentiment.total.toLocaleString() }} lệnh •
          <b class="text-emerald-500">{{ sentiment.buyCount.toLocaleString() }} Mua</b> /
          <b class="text-red-500">{{ sentiment.sellCount.toLocaleString() }} Bán</b>
        </template>
        <template v-else>
          Đang tải...
        </template>
      </div>

      <!-- Ratio bar -->
      <div class="w-full px-2">
        <div class="flex justify-between items-end mb-1.5">
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              Long
            </p>
            <p class="text-sm font-semibold tabular-nums text-emerald-500">
              {{ sentiment?.buyRatio ?? 50 }}%
            </p>
          </div>
          <div class="text-right">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              Short
            </p>
            <p class="text-sm font-semibold tabular-nums text-red-500">
              {{ sentiment?.sellRatio ?? 50 }}%
            </p>
          </div>
        </div>
        <div class="w-full flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-black/40">
          <div
            class="bg-[#00e396] h-full transition-all duration-700"
            :style="{ width: `${sentiment?.buyRatio ?? 50}%` }"
          />
          <div
            class="bg-[#ff4560] h-full transition-all duration-700"
            :style="{ width: `${sentiment?.sellRatio ?? 50}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { HomeMarketSentiment } from '../../../server/dtos/home'
import { HOME_SENTIMENT_LABEL, HOME_SENTIMENT_COLOR } from '../../../server/dtos/home'
import type { Chart as ChartType } from 'chart.js'

const props = defineProps<{
  sentiment: HomeMarketSentiment | null
  range?: { start: Date, end: Date }
  period?: 'daily' | 'weekly' | 'monthly'
}>()

const { fullLabel } = useRangeLabel(
  computed(() => props.range ?? { start: new Date(), end: new Date() }),
  computed(() => props.period ?? 'daily')
)

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const canvasRef = ref<HTMLCanvasElement>()
let chart: ChartType | null = null

// Giá trị needle — regular variable (không cần reactive, plugin closure đọc trực tiếp)
let needleScore = 50

const sentimentLabel = computed(() =>
  props.sentiment ? HOME_SENTIMENT_LABEL[props.sentiment.label] : 'Trung lập'
)
const scoreColor = computed(() =>
  props.sentiment ? HOME_SENTIMENT_COLOR[props.sentiment.label] : '#eab308'
)

function waitForLayout() {
  return new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
}

async function buildChart() {
  if (!canvasRef.value) return
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  const needlePlugin = {
    id: 'gaugeNeedle',
    afterDraw: (c: any) => {
      const angle = Math.PI + (needleScore / 100) * Math.PI
      const ctx = c.ctx
      const cx = c.canvas.offsetWidth / 2
      const cy = c.chartArea.bottom

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(0, -3)
      ctx.lineTo(c.outerRadius - 10, 0)
      ctx.lineTo(0, 3)
      ctx.fillStyle = isDark.value ? '#e2e8f0' : '#334155'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, 0, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  chart?.destroy()
  chart = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: {
      labels: ['Sợ hãi tột độ', 'Sợ hãi', 'Trung lập', 'Tham lam', 'Tham lam tột độ'],
      datasets: [{
        data: [20, 20, 20, 20, 20],
        backgroundColor: ['#ff4560', '#f97316', '#eab308', '#00e396', '#059669'],
        borderWidth: isDark.value ? 2 : 0,
        borderColor: isDark.value ? '#14141c' : '#ffffff'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      circumference: 180, rotation: 270, cutout: '75%',
      animation: { duration: 1500, easing: 'easeOutQuart' },
      transitions: { resize: { animation: { duration: 0 } } },
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    },
    plugins: [needlePlugin]
  })
}

// REBUILD mỗi khi sentiment đổi → entrance animation chạy lại (đồng bộ với 3 chart khác)
async function rebuildIfReady() {
  if (!props.sentiment) return
  needleScore = props.sentiment.score
  await waitForLayout()
  buildChart()
}

watch(() => props.sentiment, rebuildIfReady, { deep: true })
watch(isDark, async () => { await waitForLayout(); buildChart() })

onMounted(rebuildIfReady)
onUnmounted(() => chart?.destroy())
</script>
