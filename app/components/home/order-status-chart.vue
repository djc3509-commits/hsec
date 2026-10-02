<template>
  <div
    class="bg-white dark:bg-[#14141c] ring-1 ring-slate-200 dark:ring-white/5 rounded-2xl shadow-sm flex flex-col min-h-[360px]"
  >
    <div
      class="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-transparent"
    >
      <div>
        <h3 class="font-bold text-slate-700 dark:text-white text-base">
          Trạng thái lệnh
        </h3>
        <p class="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
          Phân bổ hệ thống · {{ fullLabel }}
        </p>
      </div>
      <UBadge
        :label="`${stats.pending + stats.filled + stats.canceled} Lệnh`"
        color="neutral"
        variant="soft"
        size="xs"
        class="font-bold"
      />
    </div>
    <div class="p-5 flex-1 relative flex items-center justify-center min-h-[260px]">
      <canvas
        ref="canvasRef"
        class="w-full h-full max-h-[260px]"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { OrderStatsResponse } from '../../../server/dtos/order'
import type { Chart as ChartType } from 'chart.js'

const props = defineProps<{
  stats: OrderStatsResponse
  range?: { start: Date, end: Date }
  period?: 'daily' | 'weekly' | 'monthly'
}>()

const { fullLabel } = useRangeLabel(
  computed(() => props.range ?? { start: new Date(), end: new Date() }),
  computed(() => props.period ?? 'daily')
)

const hasData = computed(() =>
  props.stats.filled + props.stats.pending + props.stats.canceled > 0
)

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const canvasRef = ref<HTMLCanvasElement>()
let chart: ChartType | null = null

function waitForLayout() {
  return new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
}

// Đọc tone theo isDark — gom 1 chỗ để dễ sync giữa build + update
function themeTones() {
  return {
    tick: isDark.value ? '#a1a1aa' : '#94a3b8',
    grid: isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
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
    type: 'polarArea',
    data: {
      labels: ['Đã khớp', 'Chờ khớp', 'Đã hủy'],
      datasets: [{
        data: [props.stats.filled, props.stats.pending, props.stats.canceled],
        backgroundColor: [
          'rgba(59,130,246,0.85)', // blue-500 (Đã khớp xanh dương)
          'rgba(234,179,8,0.85)', // purple-500 (Chờ khớp tím)
          'rgba(244,63,94,0.85)' // rose-500 (Đã hủy đỏ hồng)
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1500, easing: 'easeOutQuart' },
      transitions: { resize: { animation: { duration: 0 } } },
      scales: {
        r: { ticks: { display: false }, grid: { color: t.grid } }
      },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: t.tick, font: { size: 11 }, boxWidth: 10, padding: 10 } },
        tooltip: {
          backgroundColor: t.tooltipBg,
          titleColor: t.tooltipTitle,
          bodyColor: t.tooltipBody,
          borderWidth: 0,
          displayColors: true,
          boxPadding: 6,
          padding: { x: 12, y: 10 },
          cornerRadius: 10,
          titleFont: { size: 11, weight: 600 },
          bodyFont: { size: 12, weight: 500 }
        }
      }
    }
  })
}

function updateData() {
  if (!chart) return
  chart.data.datasets[0]!.data = [props.stats.filled, props.stats.pending, props.stats.canceled]
  chart.update('active')
}

// Theme đổi: update options trực tiếp, KHÔNG destroy + rebuild → instant, không flash animation
function applyTheme() {
  if (!chart) return
  const t = themeTones()
  const r = chart.options.scales!.r as any
  r.grid.color = t.grid
  const legend = chart.options.plugins!.legend as any
  const tooltip = chart.options.plugins!.tooltip as any
  legend.labels.color = t.tick
  tooltip.backgroundColor = t.tooltipBg
  tooltip.titleColor = t.tooltipTitle
  tooltip.bodyColor = t.tooltipBody
  chart.update('none')
}

// REBUILD mỗi khi stats đổi → chart.js entrance animation chạy lại
async function rebuildIfReady() {
  if (!hasData.value) return
  await waitForLayout()
  buildChart()
}

watch(() => props.stats, rebuildIfReady, { deep: true })
watch(isDark, applyTheme)

onMounted(rebuildIfReady)
onUnmounted(() => chart?.destroy())
</script>
