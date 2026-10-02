<template>
  <!-- Wrapper: cuộn + max-height (pattern wallet-list) -->
  <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
    <div class="overflow-y-auto max-h-[600px]">
      <UTable
        :data="coins"
        :columns="columns"
        :ui="{
          base: 'table-fixed w-full',
          th: 'sticky top-0 z-10 px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-400 uppercase tracking-wider',
          td: 'p-0 align-middle border-b border-gray-100 dark:border-gray-800/60'
        }"
      >
        <!-- # -->
        <template #rank-cell="{ row }">
          <div class="py-3 px-4 text-xs text-gray-400 tabular-nums">
            {{ row.original.rank ?? row.index + 1 }}
          </div>
        </template>

        <!-- Tên: icon + symbol + name INLINE -->
        <template #symbol-cell="{ row }">
          <div
            class="py-3 px-4 flex items-center gap-2 cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
            @click="emit('click-coin', row.original.symbol)"
          >
            <CoinIcon
              :symbol="row.original.symbol"
              :icon="row.original.icon"
              :size="24"
            />
            <div class="flex items-baseline gap-2 min-w-0">
              <span class="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">{{ row.original.symbol }}</span>
              <span class="text-xs text-gray-400 truncate">{{ row.original.name }}</span>
            </div>
          </div>
        </template>

        <!-- Giá (LIVE) — LEFT align -->
        <template #price-cell="{ row }">
          <div class="py-3 px-4 tabular-nums">
            <span
              class="text-sm font-semibold transition-colors duration-300"
              :class="liveColor(row.original.symbol)"
            >
              ${{ formatPrice(livePrice(row.original.symbol, row.original.price)) }}
            </span>
          </div>
        </template>

        <!-- 24h % (LIVE) — pill +/- -->
        <template #changePercent24h-cell="{ row }">
          <div class="py-3 px-4">
            <span
              class="text-xs font-semibold px-1.5 py-0.5 rounded tabular-nums"
              :class="livePctClass(row.original.symbol, row.original.changePercent24h)"
            >
              {{ formatChange(liveChange(row.original.symbol, row.original.changePercent24h)) }}
            </span>
          </div>
        </template>

        <!-- Đổi giá ($) -->
        <template #change24h-cell="{ row }">
          <div class="py-3 px-4 tabular-nums">
            <span
              class="text-sm font-semibold"
              :class="row.original.change24h >= 0 ? 'text-emerald-500' : 'text-red-500'"
            >
              {{ row.original.change24h >= 0 ? '+' : '−' }}${{ formatPrice(Math.abs(row.original.change24h)) }}
            </span>
          </div>
        </template>

        <!-- Cao 24h -->
        <template #high24h-cell="{ row }">
          <div class="py-3 px-4 tabular-nums">
            <span class="text-sm font-semibold text-emerald-500">
              ${{ formatPrice(row.original.high24h) }}
            </span>
          </div>
        </template>

        <!-- Thấp 24h -->
        <template #low24h-cell="{ row }">
          <div class="py-3 px-4 tabular-nums">
            <span class="text-sm font-semibold text-red-500">
              ${{ formatPrice(row.original.low24h) }}
            </span>
          </div>
        </template>

        <!-- Volume USDT -->
        <template #quoteVolume24h-cell="{ row }">
          <div class="py-3 px-4 tabular-nums">
            <span class="text-sm font-semibold text-gray-900 dark:text-white">
              ${{ formatVolume(row.original.quoteVolume24h) }}
            </span>
          </div>
        </template>

        <!-- KL Coin -->
        <template #volume24h-cell="{ row }">
          <div class="py-3 px-4 tabular-nums">
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {{ formatVolume(row.original.volume24h) }}
            </span>
          </div>
        </template>

        <!-- Vốn hoá -->
        <template #marketCap-cell="{ row }">
          <div class="py-3 px-4 tabular-nums">
            <span class="text-sm font-semibold text-gray-900 dark:text-white">
              ${{ formatVolume(row.original.marketCap) }}
            </span>
          </div>
        </template>

        <!-- Hành động Mua/Bán -->
        <template #actions-cell="{ row }">
          <div class="py-3 px-4 flex items-center justify-end gap-1.5">
            <button
              class="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              @click.stop="emit('click-coin', row.original.symbol)"
            >
              {{ t('markets.actions.buy') }}
            </button>
            <button
              class="px-3 py-1.5 text-xs font-semibold rounded-md bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
              @click.stop="emit('click-coin', row.original.symbol)"
            >
              {{ t('markets.actions.sell') }}
            </button>
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <UIcon
              name="i-heroicons-magnifying-glass"
              class="w-8 h-8 opacity-40"
            />
            <p class="text-sm">
              {{ t('markets.empty') }}
            </p>
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>

<script lang="ts" setup>
// Component THUẦN TRÌNH BÀY: chỉ nhận coins, render, click ra event.
// State (filter/search/pagination) do PAGE quản lý.
import type { TableColumn } from '@nuxt/ui'
import type { Coin } from '../../../server/dtos/coin'
import CoinIcon from '~/components/coins/CoinIcon.vue'

const { t } = useI18n()

withDefaults(defineProps<{
  coins?: Coin[]
}>(), {
  coins: () => []
})

const emit = defineEmits<{
  'click-coin': [symbol: string]
}>()

// Live ticks — đọc trực tiếp ở slot → reactive đúng cell
const { ticks } = useCoinStream()

function livePrice(symbol: string, fallback: number): number {
  return ticks.value.get(symbol)?.price ?? fallback
}
function liveChange(symbol: string, fallback: number): number {
  return ticks.value.get(symbol)?.changePercent24h ?? fallback
}
function liveColor(symbol: string): string {
  const d = ticks.value.get(symbol)?.direction
  if (d === 'up') return 'text-emerald-500'
  if (d === 'down') return 'text-red-500'
  return 'text-gray-900 dark:text-white'
}
function livePctClass(symbol: string, fallback: number): string {
  const v = liveChange(symbol, fallback)
  return v >= 0
    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
    : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
}

// Columns: 11 cột — width cứng, LEFT-align cho mọi cột số (chỉ Actions right)
// Header text dịch theo locale — wrap trong computed để tự reactive
const columns = computed<TableColumn<Coin>[]>(() => [
  { id: 'rank', accessorKey: 'rank', header: t('markets.columns.rank'), meta: { class: { th: 'w-[60px] text-left', td: 'w-[60px]' } } },
  { id: 'symbol', accessorKey: 'symbol', header: t('markets.columns.name'), meta: { class: { th: 'w-[280px] text-left', td: 'w-[280px]' } } },
  { id: 'price', accessorKey: 'price', header: t('markets.columns.price'), meta: { class: { th: 'w-[130px] text-left', td: 'w-[130px]' } } },
  { id: 'changePercent24h', accessorKey: 'changePercent24h', header: t('markets.columns.change_percent_24h'), meta: { class: { th: 'w-[120px] text-left', td: 'w-[120px]' } } },
  { id: 'change24h', accessorKey: 'change24h', header: t('markets.columns.change_24h'), meta: { class: { th: 'w-[130px] text-left', td: 'w-[130px]' } } },
  { id: 'high24h', accessorKey: 'high24h', header: t('markets.columns.high_24h'), meta: { class: { th: 'w-[130px] text-left', td: 'w-[130px]' } } },
  { id: 'low24h', accessorKey: 'low24h', header: t('markets.columns.low_24h'), meta: { class: { th: 'w-[130px] text-left', td: 'w-[130px]' } } },
  { id: 'quoteVolume24h', accessorKey: 'quoteVolume24h', header: t('markets.columns.volume_usdt'), meta: { class: { th: 'w-[150px] text-left', td: 'w-[150px]' } } },
  { id: 'volume24h', accessorKey: 'volume24h', header: t('markets.columns.volume_coin'), meta: { class: { th: 'w-[130px] text-left', td: 'w-[130px]' } } },
  { id: 'marketCap', accessorKey: 'marketCap', header: t('markets.columns.market_cap'), meta: { class: { th: 'w-[150px] text-left', td: 'w-[150px]' } } },
  { id: 'actions', accessorKey: 'symbol', header: t('markets.columns.actions'), meta: { class: { th: 'w-[150px] text-right', td: 'w-[150px]' } } }
])
</script>
