<template>
  <div
    class="lg:col-span-2 bg-white dark:bg-[#14141c] ring-1 ring-slate-100 dark:ring-white/5 rounded-2xl shadow-sm flex flex-col min-h-[360px]"
  >
    <div class="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
      <div>
        <h2 class="font-bold text-slate-800 dark:text-white text-base">
          Biến động tài sản
        </h2>
        <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">
          P&L tích lũy · {{ fullLabel }}
        </p>
      </div>
      <div
        v-if="finalPnl !== null"
        class="text-right"
      >
        <p class="text-[11px] text-slate-400 mb-0.5">
          Tổng P&L
        </p>
        <p
          class="text-base font-black tabular-nums"
          :class="finalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'"
        >
          {{ finalPnl >= 0 ? '+' : '' }}{{ formatUSD(finalPnl) }}
        </p>
      </div>
    </div>

    <div class="flex-1 relative min-h-[260px] p-2">
      <!-- Empty state -->
      <div
        v-if="!loading && !hasData"
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400"
      >
        <UIcon
          name="i-heroicons-chart-bar"
          class="w-10 h-10 opacity-20"
        />
        <p class="text-sm">
          Chưa có dữ liệu giao dịch
        </p>
      </div>
      <!-- Loading -->
      <div
        v-else-if="loading"
        class="absolute inset-0 flex items-center justify-center"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-7 h-7 animate-spin text-emerald-500/50"
        />
      </div>
      <!-- Canvas -->
      <canvas
        v-show="!loading && hasData"
        ref="canvasRef"
        class="absolute inset-0 w-full h-full"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { WalletChartPoint } from '../../../server/dtos/wallet'
import type { Chart as ChartType } from 'chart.js'

const props = defineProps<{
  points: WalletChartPoint[]
  loading: boolean
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

const hasData = computed(() => props.points.some(p => p.cumulativePnl !== 0))
const finalPnl = computed(() => props.points.length ? props.points[props.points.length - 1]!.cumulativePnl : null)
const lineColor = computed(() => (finalPnl.value ?? 0) >= 0 ? '#00e396' : '#ff4560')

function formatUSD(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Math.abs(v))
}

function waitForLayout() {
  return new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
}
async function buildChart() {
  if (!canvasRef.value) return
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  chart?.destroy()

  const color = lineColor.value
  const ctx = canvasRef.value.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, 220)
  grad.addColorStop(0, color + '40')
  grad.addColorStop(1, color + '00')

  chart = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels: props.points.map(p => new Date(p.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })),
      datasets: [{
        data: props.points.map(p => p.cumulativePnl),
        borderColor: color,
        backgroundColor: grad,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1500, easing: 'easeOutQuart' },
      transitions: { resize: { animation: { duration: 0 } } },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index', intersect: false,
          backgroundColor: isDark.value ? '#18181b' : '#fff',
          titleColor: isDark.value ? '#e4e4e7' : '#1e293b',
          bodyColor: isDark.value ? '#a1a1aa' : '#64748b',
          borderColor: isDark.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          borderWidth: 1,
          callbacks: {
            label: (c) => {
              const y = c.parsed.y ?? 0
              return ` P&L: ${y >= 0 ? '+' : ''}${formatUSD(y)}`
            }
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(161,161,170,0.08)' }, ticks: { color: 'rgba(161,161,170,0.6)', font: { size: 10 }, maxRotation: 0 } },
        y: { grid: { color: 'rgba(161,161,170,0.08)' }, ticks: { color: 'rgba(161,161,170,0.6)', font: { size: 10 }, callback: v => `$${v}` } }
      },
      interaction: { mode: 'index', intersect: false }
    }
  })
}

function updateData() {
  if (!chart) return
  chart.data.labels = props.points.map(p =>
    new Date(p.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })
  )
  chart.data.datasets[0]!.data = props.points.map(p => p.cumulativePnl)
  ;(chart.data.datasets[0] as any).borderColor = lineColor.value
  chart.update('active')
}

// Pattern: REBUILD mỗi khi data đổi → chart.js entrance animation chạy lại mỗi lần
// (chart.update() không có entrance animation, chỉ new Chart() mới có)
async function rebuildIfReady() {
  if (!hasData.value) return
  await waitForLayout()
  buildChart()
}

watch(() => props.points, rebuildIfReady, { deep: true })
watch(isDark, async () => { await waitForLayout(); buildChart() })

onMounted(rebuildIfReady)
onUnmounted(() => chart?.destroy())
</script>
