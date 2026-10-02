<template>
  <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm flex flex-col">
    <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
      <span class="text-sm font-extrabold text-gray-900 dark:text-white">{{ t('wallets.asset_list_title') }}</span>
      <span class="text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-0.5 rounded-full">
        {{ t('wallets.hero.coin_count', { count: holdings.length }) }}
      </span>
    </div>

    <div class="flex-1 overflow-y-auto max-h-[530px]">
      <UTable
        :data="holdings"
        :columns="columns"
        :ui="{
          th: 'px-4 py-3.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-gray-900 z-10',
          td: 'px-4 py-3 align-middle'
        }"
      >
        <!-- Tài sản: icon + symbol + name -->
        <template #asset-cell="{ row }">
          <div
            class="flex items-center gap-3 cursor-pointer group"
            @click="emit('click-coin', `${row.original.symbol}USDT`)"
          >
            <CoinIcon
              :symbol="row.original.symbol"
              :icon="row.original.icon"
              :size="32"
            />
            <div>
              <div class="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">
                {{ row.original.symbol }}
              </div>
              <div class="text-[11px] text-gray-500 dark:text-gray-400">
                {{ row.original.name }}
              </div>
            </div>
          </div>
        </template>

        <!-- Khối lượng -->
        <template #amount-cell="{ row }">
          <div class="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
            {{ formatPrice(row.original.amount) }}
          </div>
        </template>

        <!-- Giá vốn / Tổng vốn -->
        <template #cost-cell="{ row }">
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
              ${{ formatPrice(row.original.avgBuyPrice) }}
            </div>
            <div class="text-[11px] text-gray-500 dark:text-gray-400">
              {{ t('wallets.columns.cost_hint') }}: ${{ formatPrice(row.original.amount * row.original.avgBuyPrice) }}
            </div>
          </div>
        </template>

        <!-- Giá thị trường -->
        <template #currentPrice-cell="{ row }">
          <div class="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
            ${{ formatPrice(row.original.currentPrice) }}
          </div>
        </template>

        <!-- Tổng tiền hiện tại -->
        <template #value-cell="{ row }">
          <div class="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
            ${{ formatPrice(row.original.value) }}
          </div>
        </template>

        <!-- Lãi / Lỗ (PNL) -->
        <template #pnl-cell="{ row }">
          <div>
            <div
              class="text-sm font-semibold tabular-nums"
              :class="row.original.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
            >
              {{ row.original.pnl >= 0 ? '+' : '' }}${{ formatPrice(Math.abs(row.original.pnl)) }}
            </div>
            <div
              class="text-[11px] tabular-nums"
              :class="row.original.pnl >= 0 ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-red-600/70 dark:text-red-400/70'"
            >
              {{ row.original.pnlPercent >= 0 ? '+' : '' }}{{ row.original.pnlPercent.toFixed(2) }}%
            </div>
          </div>
        </template>

        <!-- Thao tác Mua/Bán -->
        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <button
              class="px-3 py-1 text-[11px] font-bold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              @click.stop="emit('click-coin', `${row.original.symbol}USDT`)"
            >
              {{ t('wallets.columns.buy') }}
            </button>
            <button
              class="px-3 py-1 text-[11px] font-bold rounded-md bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
              @click.stop="emit('click-coin', `${row.original.symbol}USDT`)"
            >
              {{ t('wallets.columns.sell') }}
            </button>
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <UIcon
              name="i-lucide-wallet"
              class="w-8 h-8 opacity-40"
            />
            <p class="text-sm">
              {{ t('wallets.empty') }}
            </p>
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>

<script lang="ts" setup>
// Component thuần trình bày — nhận `holdings: Holding[]` từ page.
import type { TableColumn } from '@nuxt/ui'
import type { Holding } from '../../../server/dtos/wallet'
import CoinIcon from '~/components/coins/CoinIcon.vue'

const { t } = useI18n()

withDefaults(defineProps<{
  holdings?: Holding[]
}>(), {
  holdings: () => []
})

const emit = defineEmits<{
  'click-coin': [symbol: string]
}>()

const columns = computed<TableColumn<Holding>[]>(() => [
  { id: 'asset', accessorKey: 'symbol', header: t('wallets.columns.asset') },
  { id: 'amount', accessorKey: 'amount', header: t('wallets.columns.amount') },
  { id: 'cost', accessorKey: 'avgBuyPrice', header: t('wallets.columns.cost') },
  { id: 'currentPrice', accessorKey: 'currentPrice', header: t('wallets.columns.current_price') },
  { id: 'value', accessorKey: 'value', header: t('wallets.columns.current_value') },
  { id: 'pnl', accessorKey: 'pnl', header: t('wallets.columns.pnl') },
  { id: 'actions', accessorKey: 'symbol', header: t('wallets.columns.actions'), meta: { class: { th: 'text-right', td: 'text-right' } } }
])
</script>
