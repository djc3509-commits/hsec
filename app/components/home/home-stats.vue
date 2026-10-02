<template>
  <div class="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 dark:bg-gray-800">
      <ULink
        v-for="card in cards"
        :key="card.to"
        :to="card.to"
        class="block h-full outline-none"
      >
        <div
          class="group relative h-full bg-white dark:bg-gray-900 p-5 hover:shadow-lg hover:ring-1 hover:ring-inset hover:z-10 transition-all duration-300 cursor-pointer overflow-hidden"
          :class="card.hoverRing"
        >
          <!-- Gradient overlay -->
          <div
            class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-linear-to-br"
            :class="card.gradient"
          />

          <div class="relative">
            <!-- Header -->
            <div class="flex items-center justify-between mb-4">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                :class="card.iconBg"
              >
                <UIcon
                  :name="card.icon"
                  class="w-5 h-5"
                  :class="card.iconColor"
                />
              </div>
              <UIcon
                name="i-heroicons-arrow-top-right-on-square"
                class="w-4 h-4 text-gray-300 dark:text-gray-600 transition-colors"
                :class="card.arrowHover"
              />
            </div>

            <!-- Label -->
            <p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              {{ card.label }}
            </p>

            <!-- Value -->
            <component :is="card.valueComponent" />

            <!-- Sub -->
            <component :is="card.subComponent" />
          </div>
        </div>
      </ULink>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { h } from 'vue'

// Dùng composable mới (KHÔNG Pinia). useWallet load ví user; useCoinCatalog load danh sách coin từ DB.
const catalog = useCoinCatalog()
const { overview, holdings, init } = useWallet()

// ── Tài sản ───────────────────────────────────────────────────────────────
const totalValue = computed(() => {
  const v = overview.value?.totalValue ?? 0
  return formatPrice(v)
})

const totalPnl = computed(() =>
  holdings.value.reduce((s, h) => s + h.pnl, 0)
)

// ── Thị trường ────────────────────────────────────────────────────────────
const coinCount = computed(() => catalog.items.value.length)

const topGainer = computed(() =>
  catalog.items.value.length
    ? [...catalog.items.value].sort((a, b) => b.changePercent24h - a.changePercent24h)[0]
    : null
)

const topGainerSymbol = computed(() => topGainer.value?.symbol ?? '--')

const topGainerPct = computed(() => {
  if (!topGainer.value) return ''
  const pct = topGainer.value.changePercent24h
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
})

// ── Tin tức ───────────────────────────────────────────────────────────────
const newArticlesCount = ref(0)

async function fetchNewsStats() {
  try {
    const res = await $fetch<{ data?: { count?: number } }>('/api/news/unread-count')
    newArticlesCount.value = res?.data?.count ?? 0
  } catch {
    newArticlesCount.value = 0
  }
}

// ── Card config ───────────────────────────────────────────────────────────
const cards = computed(() => [
  {
    to: '/wallets',
    label: 'Tổng tài sản',
    icon: 'i-heroicons-wallet',
    iconBg: 'bg-blue-50 dark:bg-blue-900/30',
    iconColor: 'text-blue-500',
    gradient: 'from-blue-500/5 to-indigo-500/5',
    hoverRing: 'hover:ring-primary-400 dark:hover:ring-primary-500',
    arrowHover: 'group-hover:text-blue-500',

    valueComponent: () => h(
      'p',
      { class: 'text-2xl font-semibold text-gray-900 dark:text-white tabular-nums' },
      `$${totalValue.value}`
    ),

    subComponent: () => h(
      'div',
      { class: 'flex items-center gap-1.5 mt-2' },
      [
        h('span', {
          class: `text-xs font-medium ${totalPnl.value >= 0 ? 'text-emerald-500' : 'text-red-500'}`
        }, `${totalPnl.value >= 0 ? '+' : '−'}$${Math.abs(totalPnl.value).toFixed(2)}`),
        h('span', { class: 'text-[10px] text-gray-400' }, 'hôm nay')
      ]
    )
  },

  {
    to: '/orders',
    label: 'Giao dịch ngay',
    icon: 'i-heroicons-bolt',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-500',
    gradient: 'from-emerald-500/5 to-teal-500/5',
    hoverRing: 'hover:ring-emerald-400 dark:hover:ring-emerald-500',
    arrowHover: 'group-hover:text-emerald-500',

    valueComponent: () => h(
      'p',
      { class: 'text-2xl font-semibold text-gray-900 dark:text-white tabular-nums' },
      'BNB / USDT'
    ),

    subComponent: () => h(
      'div',
      { class: 'flex items-center gap-1.5 mt-2' },
      [
        h('span', { class: 'inline-flex items-center gap-1 text-xs font-semibold text-emerald-500' }, [
          h('span', { class: 'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' }),
          'Live · Khớp lệnh tức thì'
        ])
      ]
    )
  },

  {
    to: '/markets',
    label: 'Thị trường',
    icon: 'i-heroicons-chart-bar-square',
    iconBg: 'bg-amber-50 dark:bg-amber-900/30',
    iconColor: 'text-amber-500',
    gradient: 'from-amber-500/5 to-orange-500/5',
    hoverRing: 'hover:ring-amber-400 dark:hover:ring-amber-500',
    arrowHover: 'group-hover:text-amber-500',

    valueComponent: () => h(
      'p',
      { class: 'text-2xl font-semibold text-gray-900 dark:text-white tabular-nums' },
      `${coinCount.value}+ Coin`
    ),

    subComponent: () => h(
      'div',
      { class: 'flex items-center gap-1.5 mt-2' },
      [
        h('span', { class: 'text-xs text-gray-400' }, [
          'Top hôm nay: ',
          h('b', { class: 'text-emerald-500' }, `${topGainerSymbol.value} ${topGainerPct.value}`)
        ])
      ]
    )
  },

  {
    to: '/news',
    label: 'Tin tức thị trường',
    icon: 'i-heroicons-newspaper',
    iconBg: 'bg-rose-50 dark:bg-rose-900/30',
    iconColor: 'text-rose-500',
    gradient: 'from-rose-500/5 to-pink-500/5',
    hoverRing: 'hover:ring-rose-400 dark:hover:ring-rose-500',
    arrowHover: 'group-hover:text-rose-500',

    valueComponent: () => h(
      'p',
      { class: 'text-2xl font-semibold text-gray-900 dark:text-white tabular-nums' },
      [
        `${newArticlesCount.value}+ `,
        h('span', { class: 'text-lg font-semibold' }, 'tin mới')
      ]
    ),

    subComponent: () => h(
      'div',
      { class: 'flex items-center gap-1.5 mt-2' },
      newArticlesCount.value > 0
        ? [h('span', { class: 'inline-flex items-center gap-1 text-xs text-rose-500 font-medium' }, [
            h('span', { class: 'w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse' }),
            'Đang có biến động'
          ])]
        : [h('span', { class: 'text-xs text-gray-400' }, 'Chưa có tin mới')]
    )
  }
])

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  catalog.limit.value = 200
  await Promise.all([
    init(),
    catalog.load(),
    fetchNewsStats()
  ])
})
</script>
