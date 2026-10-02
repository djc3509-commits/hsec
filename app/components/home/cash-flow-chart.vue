<template>
  <div
    class="bg-white dark:bg-[#14141c] ring-1 ring-slate-200 dark:ring-white/5 rounded-2xl shadow-sm lg:col-span-2 flex flex-col min-h-[360px]"
  >
    <div class="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-transparent">
      <div>
        <h3 class="font-bold text-slate-700 dark:text-white text-base">
          Dòng tiền giao dịch
        </h3>
        <p class="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
          Khối lượng Mua/Bán · {{ fullLabel }}
        </p>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded bg-[#00e396]" />
          <span class="text-[11px] text-slate-500 font-medium">Mua vào</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded bg-[#ff4560]" />
          <span class="text-[11px] text-slate-500 font-medium">Bán ra</span>
        </div>
      </div>
    </div>
    <div class="p-5 flex-1 relative min-h-[260px]">
      <div
        v-if="!hasData"
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400"
      >
        <UIcon
          name="i-heroicons-arrow-trending-up"
          class="w-10 h-10 opacity-20"
        />
        <p class="text-sm">
          Chưa có dữ liệu giao dịch
        </p>
      </div>
      <canvas
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

const hasData = computed(() => props.points.some(p => p.buyCost > 0 || p.sellRevenue > 0))

function waitForLayout() {
  return new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
}

function makeLabels() {
  return props.points.map(p => new Date(p.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' }))
}

// Đọc tone theo isDark — gom 1 chỗ để dễ sync giữa build + update
function themeTones() {
  return {
    tick: isDark.value ? '#a1a1aa' : '#94a3b8',
    grid: isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(148,163,184,0.15)',
    tooltipBg: isDark.value ? 'rgba(24,24,27,0.95)' : 'rgba(255,255,255,0.98)',
    tooltipTitle: isDark.value ? '#fafafa' : '#0f172a',
    tooltipBody: isDark.value ? '#d4d4d8' : '#475569'
  }
}

async function buildChart() {
  if (!canvasRef.value) return
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  const t = themeTones()

  chart?.destroy()
  chart = new Chart(canvasRef.value, {
    type: 'bar',
    data: {
      labels: makeLabels(),
      datasets: [
        { label: 'Mua', data: props.points.map(p => p.buyCost), backgroundColor: '#00e396', borderRadius: 4, barPercentage: 0.5 },
        { label: 'Bán', data: props.points.map(p => p.sellRevenue), backgroundColor: '#ff4560', borderRadius: 4, barPercentage: 0.5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1500, easing: 'easeOutQuart' },
      transitions: { resize: { animation: { duration: 0 } } },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index', intersect: false,
          backgroundColor: t.tooltipBg,
          titleColor: t.tooltipTitle,
          bodyColor: t.tooltipBody,
          borderWidth: 0,
          displayColors: true,
          boxPadding: 6,
          padding: { x: 12, y: 10 },
          cornerRadius: 10,
          titleFont: { size: 11, weight: 600 },
          bodyFont: { size: 12, weight: 500 },
          callbacks: { label: c => ` ${c.dataset.label}: $${Number(c.parsed.y).toLocaleString()}` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: t.tick, font: { size: 11 } } },
        y: { border: { display: false }, grid: { color: t.grid }, ticks: { color: t.tick, font: { size: 11 }, callback: v => `$${Number(v).toLocaleString()}` } }
      },
      interaction: { mode: 'index', intersect: false }
    }
  })
}

function updateData() {
  if (!chart) return
  chart.data.labels = makeLabels()
  chart.data.datasets[0]!.data = props.points.map(p => p.buyCost)
  chart.data.datasets[1]!.data = props.points.map(p => p.sellRevenue)
  chart.update('active')
}

// Theme đổi: update options trực tiếp, KHÔNG destroy + rebuild → instant, không flash animation
function applyTheme() {
  if (!chart) return
  const t = themeTones()
  const x = chart.options.scales!.x as any
  const y = chart.options.scales!.y as any
  x.ticks.color = t.tick
  y.ticks.color = t.tick
  y.grid.color = t.grid
  const tooltip = chart.options.plugins!.tooltip as any
  tooltip.backgroundColor = t.tooltipBg
  tooltip.titleColor = t.tooltipTitle
  tooltip.bodyColor = t.tooltipBody
  chart.update('none')
}

// REBUILD mỗi khi data đổi → chart.js entrance animation chạy lại
async function rebuildIfReady() {
  if (!hasData.value) return
  await waitForLayout()
  buildChart()
}

watch(() => props.points, rebuildIfReady, { deep: true })
watch(isDark, applyTheme)

onMounted(rebuildIfReady)
onUnmounted(() => chart?.destroy())
</script>
