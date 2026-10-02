<!--
  /analyst/history — Performance dashboard cho AI Analyst.
  Stats + Equity Curve + Bảng đề xuất (UTable, columns dựng bằng render fn).
  Dark/light auto. Không emoji — chỉ UIcon.
-->
<script setup lang="ts">
import type { VNode } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { RecHistoryRow } from '../../../server/dtos/analyst'
import TermPopover from '~/components/ui/term-popover.vue'
import HistoryDetailModal from '~/components/analyst/history-detail-modal.vue'
import type { Term } from '~/composables/analyst/useTradingGlossary'

definePageMeta({ layout: 'blank' })

// ─── i18n + thuật ngữ (nguồn chung) ──────────────────────────
const { t, locale, setLocale } = useI18n()
const { term, tlabel, statusBadge, statusTerm, fmtPrice } = useTradingGlossary()

function toggleLocale() {
  setLocale(locale.value === 'vi' ? 'en' : 'vi')
}

// ─── State & data (gom hết trong composable) ─────────────────
const colorMode = useColorMode()
const toast = useToast()
const catalog = useCoinCatalog()

const {
  items, stats, total, isEmpty, loading,
  initialCapital, equityPoints, finalEquity, growthPct,
  load, removeOne, removeAll, closePosition
} = useAnalystHistory(50)

// ─── Modal chi tiết phân tích ────────────────────────────────
const detailOpen = ref(false)
const detailId = ref<number | null>(null)
function openDetail(id: number) {
  detailId.value = id
  detailOpen.value = true
}
const detailIcon = computed(() => {
  const row = items.value.find(r => r.id === detailId.value)
  return row ? coinIcon(row.symbol) : null
})

onMounted(() => {
  load()
  // Tải catalog để map symbol → icon thật (giống trang /analyst)
  catalog.limit.value = 200
  catalog.load()
})

// ─── Helpers hiển thị ────────────────────────────────────────
function coinIcon(sym: string): string | null {
  return catalog.items.value.find(c => c.symbol === sym)?.icon ?? null
}

const COIN_COLOR: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', SOL: '#9945ff', BNB: '#f3ba2f', XRP: '#00d4ff'
}
function coinColor(sym: string) {
  return COIN_COLOR[sym] ?? '#71717a'
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

// ─── Equity curve SVG path (trình bày thuần) ─────────────────
const equityPath = computed(() => {
  const pts = equityPoints.value
  if (pts.length < 2) return ''
  const min = Math.min(...pts), max = Math.max(...pts)
  const w = 1000, h = 200, pad = max - min || 1
  const dx = w / (pts.length - 1)
  return pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * dx).toFixed(1)},${(h - ((v - min) / pad) * h).toFixed(1)}`).join(' ')
})
const equityFillPath = computed(() => (equityPath.value ? `${equityPath.value} L1000,200 L0,200 Z` : ''))

// ─── UTable columns (render fn, kiểu settings-members-list) ──
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')

// Căn lề ngay tại ô th/td (cùng 1 trục cho header + data → luôn thẳng hàng).
const alignLeft = { class: { th: 'text-left', td: 'text-left' } }
const alignCenter = { class: { th: 'text-center', td: 'text-center' } }
const alignRight = { class: { th: 'text-right', td: 'text-right' } }

// Header bảng có hover-popover giải thích thuật ngữ.
function termHeader(text: string, g: Term) {
  return () => h(TermPopover, { en: g.en, vi: g.vi, desc: g.desc }, () => h('span', { class: 'font-semibold' }, text))
}
// Bọc 1 vnode (badge/text) trong popover, không gạch chân (badge tự là gợi ý).
function wrapTerm(g: Term, child: () => VNode) {
  return h(TermPopover, { en: g.en, vi: g.vi, desc: g.desc, hint: false }, child)
}

const columns = computed<TableColumn<RecHistoryRow>[]>(() => [
  {
    accessorKey: 'id',
    header: () => h('span', { class: 'font-semibold' }, '#'),
    cell: ({ row }) => h('span', { class: 'font-mono text-xs text-slate-500' }, `#${row.original.id}`)
  },
  {
    accessorKey: 'createdAt',
    header: () => h('span', { class: 'font-semibold' }, t('analyst.history.col.date')),
    cell: ({ row }) => h('span', { class: 'text-slate-600 dark:text-gray-400' }, fmtDate(row.original.createdAt))
  },
  {
    accessorKey: 'symbol',
    header: () => h('span', { class: 'font-semibold' }, t('analyst.history.col.coin')),
    cell: ({ row }) => {
      const sym = row.original.symbol
      const icon = coinIcon(sym)
      return h('button', {
        'type': 'button',
        'class': 'group flex items-center gap-2 -mx-1 px-1 py-0.5 rounded-md cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors',
        'title': t('analyst.history.viewDetail', { sym }),
        'aria-label': t('analyst.history.viewDetail', { sym }),
        'onClick': () => openDetail(row.original.id)
      }, [
        icon
          ? h('img', { src: icon, alt: sym, class: 'w-6 h-6 rounded-full bg-slate-100 dark:bg-gray-800 shrink-0' })
          : h('div', {
              class: 'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0',
              style: { background: coinColor(sym) }
            }, sym[0]),
        h('span', { class: 'font-bold group-hover:text-primary-600 dark:group-hover:text-primary-400' }, sym),
        h(UIcon, { name: 'i-lucide-arrow-up-right', class: 'w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0' })
      ])
    }
  },
  {
    accessorKey: 'horizon',
    header: termHeader(t('analyst.history.col.horizon'), term('horizon')),
    cell: ({ row }) => wrapTerm(term(row.original.horizon), () =>
      h(UBadge, { variant: 'soft', color: 'neutral', size: 'xs' }, () => tlabel('horizon', row.original.horizon)))
  },
  {
    accessorKey: 'direction',
    meta: alignCenter,
    header: termHeader(t('analyst.history.col.direction'), term('direction')),
    cell: ({ row }) => {
      const up = row.original.direction === 'UP'
      return wrapTerm(up ? term('long') : term('short'), () => h('span', {
        class: ['inline-flex items-center gap-1 text-xs font-bold', up ? 'text-emerald-500' : 'text-red-500']
      }, [
        h(UIcon, { name: up ? 'i-lucide-trending-up' : 'i-lucide-trending-down', class: 'w-4 h-4 shrink-0' }),
        h('span', up ? 'LONG' : 'SHORT')
      ]))
    }
  },
  {
    accessorKey: 'confidence',
    meta: alignLeft,
    header: termHeader(t('analyst.history.col.conf'), term('confidence')),
    cell: ({ row }) => h('span', { class: 'tabular-nums font-medium text-slate-600' }, `${row.original.confidence}%`)
  },
  {
    accessorKey: 'entryPrice',
    meta: alignLeft,
    header: termHeader(t('analyst.history.col.entry'), term('entry')),
    cell: ({ row }) => h('span', { class: 'tabular-nums font-medium text-slate-600' }, `$${fmtPrice(row.original.entryPrice)}`)
  },
  {
    accessorKey: 'exitPrice',
    meta: alignLeft,
    header: termHeader(t('analyst.history.col.exit'), term('exit')),
    cell: ({ row }) => h('span', { class: 'tabular-nums font-medium text-slate-600' }, row.original.exitPrice ? `$${fmtPrice(row.original.exitPrice)}` : '—')
  },
  {
    accessorKey: 'status',
    meta: alignCenter,
    header: () => h('span', { class: 'font-semibold' }, t('analyst.history.col.status')),
    cell: ({ row }) => {
      const b = statusBadge(row.original.status)
      return wrapTerm(statusTerm(row.original.status), () =>
        h(UBadge, { color: b.color, variant: 'soft', size: 'xs', icon: b.icon, class: 'font-semibold' }, () => b.label))
    }
  },
  {
    accessorKey: 'pnl',
    meta: alignLeft,
    header: termHeader(t('analyst.history.col.pnl'), term('pnl')),
    cell: ({ row }) => {
      const p = row.original.pnl
      return h('span', {
        class: ['tabular-nums font-semibold', p > 0 ? 'text-success' : p < 0 ? 'text-error' : 'text-slate-400']
      }, `${p > 0 ? '+' : ''}$${p.toFixed(0)}`)
    }
  },
  {
    id: 'actions',
    meta: alignRight,
    header: () => h('span', { class: 'font-semibold' }, t('analyst.history.col.actions')),
    cell: ({ row }) => {
      const r = row.original
      const actions = []
      if (r.status === 'OPEN') {
        actions.push(h(UButton, {
          'icon': 'i-lucide-circle-check', 'color': 'primary', 'variant': 'ghost', 'size': 'xs',
          'label': t('analyst.history.close'), 'aria-label': t('analyst.history.closeAria', { id: r.id }),
          'onClick': () => askClose(r.id)
        }))
      }
      actions.push(h(UButton, {
        'icon': 'i-lucide-trash-2', 'color': 'error', 'variant': 'ghost', 'size': 'xs',
        'aria-label': t('analyst.history.deleteAria', { id: r.id }),
        'onClick': () => askDeleteOne(r.id)
      }))
      return h('div', { class: 'inline-flex items-center gap-1' }, actions)
    }
  }
])

// ─── Confirm modal (UModal) ──────────────────────────────────
const confirmState = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: '',
  confirmColor: 'error' as 'error' | 'primary',
  confirmIcon: 'i-lucide-trash-2',
  loading: false,
  action: null as null | (() => Promise<void>)
})

function askDeleteOne(id: number) {
  Object.assign(confirmState, {
    title: t('analyst.history.delOne.title'),
    message: t('analyst.history.delOne.msg', { id }),
    confirmText: t('analyst.history.delete'),
    confirmColor: 'error',
    confirmIcon: 'i-lucide-trash-2',
    action: () => doDelete(() => removeOne(id), t('analyst.history.toast.deletedOne'), 1),
    open: true
  })
}

function askDeleteAll() {
  const count = items.value.length
  if (!count) return
  Object.assign(confirmState, {
    title: t('analyst.history.delAll.title'),
    message: t('analyst.history.delAll.msg', { count }),
    confirmText: t('analyst.history.deleteAll'),
    confirmColor: 'error',
    confirmIcon: 'i-lucide-trash-2',
    action: () => doDelete(removeAll, t('analyst.history.toast.deletedAll'), count),
    open: true
  })
}

function askClose(id: number) {
  Object.assign(confirmState, {
    title: t('analyst.history.closeConfirm.title'),
    message: t('analyst.history.closeConfirm.msg', { id }),
    confirmText: t('analyst.history.close'),
    confirmColor: 'primary',
    confirmIcon: 'i-lucide-circle-check',
    action: () => doClose(id),
    open: true
  })
}

async function doDelete(fn: () => Promise<void>, successMsg: string, count: number) {
  await fn()
  toast.add({
    title: successMsg,
    description: t('analyst.history.toast.removedDesc', { count }),
    icon: 'i-lucide-trash-2',
    color: 'success',
    duration: 4000
  })
}

async function doClose(id: number) {
  const row = items.value.find(r => r.id === id)
  const res = await closePosition(id)
  const win = res.status === 'HIT_TP'
  const sym = row?.symbol ?? ''
  const entry = row ? fmtPrice(row.entryPrice) : '?'
  const sign = win ? '+' : '-'
  const result = win ? t('analyst.history.profit') : t('analyst.history.loss')
  const outcome = win ? t('analyst.status.HIT_TP') : t('analyst.status.HIT_SL')
  toast.add({
    title: t('analyst.history.closeToast.title', { id, sym, result, amount: `${sign}$${Math.abs(res.pnl)}` }),
    description: t('analyst.history.closeToast.desc', { entry: `$${entry}`, exit: `$${fmtPrice(res.exitPrice)}`, outcome }),
    icon: win ? 'i-lucide-trending-up' : 'i-lucide-trending-down',
    color: win ? 'success' : 'error',
    duration: 5000
  })
}

async function runConfirm() {
  if (!confirmState.action) return
  confirmState.loading = true
  try {
    await confirmState.action()
    confirmState.open = false
  } catch (err) {
    toast.add({
      title: t('analyst.history.error'), description: (err as { data?: { statusMessage?: string } })?.data?.statusMessage || t('analyst.history.actionFailed'), color: 'error', icon: 'i-lucide-circle-x'
    })
  } finally {
    confirmState.loading = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 text-slate-900 dark:text-gray-100">
    <!-- Header -->
    <div class="sticky top-0 z-20 border-b border-slate-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md">
      <div class="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UButton
            to="/analyst"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
          />
          <div class="w-10 h-10 rounded-xl bg-linear-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg shadow-primary/30">
            <UIcon
              name="i-lucide-bar-chart-3"
              class="w-5 h-5 text-white"
            />
          </div>
          <div>
            <h1 class="text-base font-extrabold">
              {{ t('analyst.history.title') }}
            </h1>
            <p class="text-xs text-slate-500 dark:text-gray-400">
              {{ t('analyst.history.subtitle') }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UTooltip :text="t('analyst.form.langSwitch')">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              class="gap-1.5"
              :aria-label="t('analyst.form.langSwitch')"
              @click="toggleLocale"
            >
              <UIcon
                name="i-lucide-languages"
                class="w-4 h-4"
              />
              <span class="text-xs font-bold uppercase">{{ locale }}</span>
            </UButton>
          </UTooltip>
          <UButton
            :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="loading"
            @click="load"
          />
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <!-- Loading skeleton -->
      <div
        v-if="loading && !stats"
        class="space-y-4"
      >
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <USkeleton
            v-for="i in 4"
            :key="i"
            class="h-32 rounded-2xl"
          />
        </div>
        <USkeleton class="h-64 rounded-2xl" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="isEmpty"
        class="text-center py-16"
      >
        <UIcon
          name="i-lucide-clipboard-list"
          class="w-16 h-16 text-slate-300 dark:text-gray-700 mx-auto mb-4"
        />
        <h2 class="text-xl font-bold mb-2">
          {{ t('analyst.history.empty.title') }}
        </h2>
        <p class="text-sm text-slate-500 dark:text-gray-400 mb-6">
          {{ t('analyst.history.empty.desc') }}
        </p>
        <UButton
          to="/analyst"
          color="primary"
          icon="i-lucide-sparkles"
        >
          {{ t('analyst.history.empty.cta') }}
        </UButton>
      </div>

      <!-- Content -->
      <div
        v-else-if="stats"
        class="space-y-6"
      >
        <div>
          <h2 class="text-2xl font-black mb-1">
            {{ t('analyst.history.headline') }}
          </h2>
          <p class="text-sm text-slate-500 dark:text-gray-400">
            {{ t('analyst.history.headlineSub', { total: stats.total }) }}
          </p>
        </div>

        <!-- 4 STAT CARDS -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <UCard :ui="{ body: 'p-5 relative overflow-hidden' }">
            <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-100 dark:bg-emerald-950/40 rounded-full" />
            <div class="relative">
              <div class="flex items-center justify-between mb-2">
                <TermPopover v-bind="term('winRate')">
                  <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">{{ t('analyst.history.stat.winRate') }}</span>
                </TermPopover>
                <UIcon
                  name="i-lucide-target"
                  class="w-5 h-5 text-emerald-500"
                />
              </div>
              <div class="text-4xl font-black">
                {{ stats.winRate }}%
              </div>
              <div class="text-xs text-slate-500 mt-1">
                {{ t('analyst.history.stat.winLoss', { wins: stats.wins, losses: stats.losses }) }}
              </div>
            </div>
          </UCard>

          <UCard :ui="{ body: 'p-5 relative overflow-hidden' }">
            <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-primary-100 dark:bg-primary-950/40 rounded-full" />
            <div class="relative">
              <div class="flex items-center justify-between mb-2">
                <TermPopover v-bind="term('pnl')">
                  <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">{{ t('analyst.history.stat.totalPnl') }}</span>
                </TermPopover>
                <UIcon
                  name="i-lucide-dollar-sign"
                  class="w-5 h-5 text-primary-500"
                />
              </div>
              <div
                class="text-4xl font-semibold tabular-nums"
                :class="stats.totalPnl >= 0 ? 'text-success' : 'text-error'"
              >
                {{ stats.totalPnl >= 0 ? '+' : '' }}${{ stats.totalPnl.toFixed(0) }}
              </div>
              <div
                class="text-xs mt-1"
                :class="stats.totalPnl >= 0 ? 'text-emerald-600' : 'text-red-600'"
              >
                {{ t('analyst.history.stat.onCapital', { pct: `${stats.totalPnl >= 0 ? '+' : ''}${growthPct.toFixed(1)}`, capital: initialCapital }) }}
              </div>
            </div>
          </UCard>

          <UCard :ui="{ body: 'p-5 relative overflow-hidden' }">
            <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-100 dark:bg-amber-950/40 rounded-full" />
            <div class="relative">
              <div class="flex items-center justify-between mb-2">
                <TermPopover v-bind="term('bestTrade')">
                  <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">{{ t('analyst.history.stat.bestTrade') }}</span>
                </TermPopover>
                <UIcon
                  name="i-lucide-trophy"
                  class="w-5 h-5 text-amber-500"
                />
              </div>
              <div class="text-4xl font-semibold tabular-nums">
                +${{ stats.bestTrade.toFixed(0) }}
              </div>
              <div class="text-xs text-slate-500 mt-1">
                {{ t('analyst.history.stat.bestTradeSub') }}
              </div>
            </div>
          </UCard>

          <UCard :ui="{ body: 'p-5 relative overflow-hidden' }">
            <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-100 dark:bg-blue-950/40 rounded-full" />
            <div class="relative">
              <div class="flex items-center justify-between mb-2">
                <TermPopover v-bind="term('open')">
                  <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">{{ t('analyst.history.stat.open') }}</span>
                </TermPopover>
                <UIcon
                  name="i-lucide-clock"
                  class="w-5 h-5 text-blue-500"
                />
              </div>
              <div class="text-4xl font-black">
                {{ stats.open }}
              </div>
              <div class="text-xs text-slate-500 mt-1">
                {{ t('analyst.history.stat.openSub') }}
              </div>
            </div>
          </UCard>
        </div>

        <!-- EQUITY CURVE -->
        <UCard>
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-trending-up"
                  class="w-5 h-5 text-primary-500"
                />
                <TermPopover v-bind="term('equity')">
                  <h3 class="text-base font-extrabold">
                    {{ t('analyst.history.equity.title') }}
                  </h3>
                </TermPopover>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                {{ t('analyst.history.equity.sub', { start: initialCapital, now: finalEquity.toFixed(0) }) }}
              </p>
            </div>
            <UBadge
              :color="stats.totalPnl >= 0 ? 'success' : 'error'"
              variant="soft"
              size="lg"
            >
              {{ t('analyst.history.equity.badge', { pct: `${stats.totalPnl >= 0 ? '+' : ''}${growthPct.toFixed(1)}`, total: stats.total }) }}
            </UBadge>
          </div>
          <svg
            viewBox="0 0 1000 200"
            class="w-full h-48"
          >
            <defs>
              <linearGradient
                id="eq-grad"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stop-color="#8b5cf6"
                  stop-opacity="0.3"
                />
                <stop
                  offset="100%"
                  stop-color="#8b5cf6"
                  stop-opacity="0"
                />
              </linearGradient>
            </defs>
            <path
              :d="equityFillPath"
              fill="url(#eq-grad)"
            />
            <path
              :d="equityPath"
              stroke="#8b5cf6"
              stroke-width="2.5"
              fill="none"
            />
          </svg>
        </UCard>

        <!-- TABLE (UTable) -->
        <UCard :ui="{ body: 'p-0' }">
          <div class="px-6 py-4 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-list"
                class="w-4 h-4 text-primary-500"
              />
              <h3 class="text-base font-extrabold">
                {{ t('analyst.history.tableTitle') }}
              </h3>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-slate-400">{{ t('analyst.history.count', { total }) }}</span>
              <UButton
                v-if="items.length"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click="askDeleteAll"
              >
                {{ t('analyst.history.deleteAll') }}
              </UButton>
            </div>
          </div>

          <UTable
            :data="items"
            :columns="columns"
            :loading="loading"
            :ui="{
              th: 'px-4 py-3 text-xs uppercase tracking-wider text-slate-500',
              td: 'px-4 py-3 text-sm'
            }"
          />
        </UCard>
      </div>
    </div>

    <!-- Modal chi tiết phân tích -->
    <HistoryDetailModal
      :id="detailId"
      v-model:open="detailOpen"
      :icon="detailIcon"
    />

    <!-- Confirm modal (UModal) -->
    <UModal
      v-model:open="confirmState.open"
      :title="confirmState.title"
      :ui="{ content: 'max-w-md', footer: 'justify-end' }"
    >
      <template #body>
        <p class="text-sm text-slate-600 dark:text-gray-300">
          {{ confirmState.message }}
        </p>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          :label="t('analyst.history.cancel')"
          @click="confirmState.open = false"
        />
        <UButton
          :color="confirmState.confirmColor"
          :icon="confirmState.confirmIcon"
          :label="confirmState.confirmText"
          :loading="confirmState.loading"
          @click="runConfirm"
        />
      </template>
    </UModal>
  </div>
</template>
