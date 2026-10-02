<template>
  <UDashboardPanel
    grow
    class="flex flex-col overflow-hidden"
  >
    <!-- === NAVBAR === -->
    <UDashboardNavbar>
      <template #leading>
        <UDashboardSidebarCollapse />
        <OrdersCoinSelector
          v-model="symbol"
          :coins="quickCoins"
          :current-price="currentPrice"
          :price-change="priceChange"
          :price-up="priceUp"
        />
      </template>

      <template #center>
        <div class="hidden lg:flex items-center gap-5">
          <div
            v-for="s in headerStats"
            :key="s.label"
            class="flex flex-col items-center"
          >
            <span class="text-[10px] text-gray-400 dark:text-gray-500 leading-none mb-0.5">{{ s.label }}</span>
            <span
              class="text-xs font-semibold tabular-nums"
              :class="s.color ?? 'text-gray-700 dark:text-gray-300'"
            >{{ s.value }}</span>
          </div>
        </div>
      </template>

      <template #right>
        <div class="flex items-center gap-1.5">
          <UTabs
            v-model="activeTopTab"
            :items="topTabItems"
            variant="pill"
            size="sm"
            :content="false"
            class="hidden sm:flex"
          />
        </div>
      </template>
    </UDashboardNavbar>

    <!-- ═══ MAIN GRID ═══ -->
    <div class="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-[0.7fr_1.8fr_0.7fr] lg:grid-rows-[minmax(0,1fr)] gap-2 p-2">
      <!-- ── COL LEFT ── -->
      <OrdersBookPanel
        v-model:ob-mode="obMode"
        :asks="asks"
        :bids="bids"
        :current-price="currentPrice"
        :price-up="priceUp"
        :buy-ratio="buyRatio"
        :sell-ratio="sellRatio"
        @click-price="clickObPrice"
      />

      <!-- ── COL CENTER ── -->
      <div
        class="min-w-0 min-h-0 flex flex-col gap-2 fade-in-up"
        style="animation-delay: 100ms"
      >
        <!-- Chart -->
        <div class="flex-45 min-h-0 relative">
          <Chart
            :symbol="symbol"
            :icon="currentCoin?.icon ?? null"
            class="absolute inset-0 w-full h-full"
          />
        </div>

        <!-- Trade Form -->
        <div class="shrink-0 lg:flex-55 min-h-0 flex flex-col bg-white dark:bg-gray-900 rounded-xl ring-1 ring-gray-200/60 dark:ring-gray-800/60 overflow-hidden shadow-sm fade-in-up">
          <div class="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr] divide-x divide-gray-100 dark:divide-gray-800 min-h-0 overflow-hidden">
            <OrdersSideForm
              v-model:price="buyForm.price.value"
              v-model:qty="buyForm.qty.value"
              v-model:total="buyForm.total.value"
              side="buy"
              :coin-symbol="wallet.coinSymbol"
              :balance="wallet.cashBalance"
              :fee-rate="buyForm.feeRate.value"
              :fee-amount="buyForm.feeAmount.value"
              :is-submitting="buyForm.isSubmitting.value"
              @set-pct="buyForm.setPct"
              @click-bbo="buyForm.setBBO(bestAsk)"
              @submit="buyForm.submit"
            />

            <OrdersSideForm
              v-model:price="sellForm.price.value"
              v-model:qty="sellForm.qty.value"
              v-model:total="sellForm.total.value"
              side="sell"
              :coin-symbol="wallet.coinSymbol"
              :balance="wallet.coinBalance"
              :fee-rate="sellForm.feeRate.value"
              :fee-amount="sellForm.feeAmount.value"
              :is-submitting="sellForm.isSubmitting.value"
              @set-pct="sellForm.setPct"
              @click-bbo="sellForm.setBBO(bestBid)"
              @submit="sellForm.submit"
            />
          </div>
        </div>
      </div>

      <!-- ── COL RIGHT ── -->
      <div
        class="min-h-0 flex flex-col gap-2 fade-in-up"
        style="animation-delay: 250ms"
      >
        <OrdersPairsList />
        <OrdersRecentTrades
          ref="recentTradesRef"
          :symbol="symbol"
        />
      </div>
    </div>

    <!-- ═══ ORDER HISTORY PANEL ═══ -->
    <OrdersHistoryPanel
      ref="orderHistoryRef"
      :symbol="symbol"
      @filled="onOrderFilled"
    />

    <!-- ═══ STATUS BAR ═══ -->
    <OrdersStatusBar
      ref="statusBarRef"
      :buy-ratio="buyRatio"
      :sell-ratio="sellRatio"
    />
  </UDashboardPanel>
</template>

<script lang="ts" setup>
import type { OrdersHistoryPanel, OrdersStatusBar } from '#components'
import Chart from '~/components/charts/chart.vue'
import { useOrderBook } from '~/composables/orders/useOrderBook'
import { useTradeForm } from '~/composables/orders/useTradeForm'

definePageMeta({ hideFooter: true })

const { t } = useI18n()

// ── DATA: catalog (DB) + stream (live overlay) + wallet ──
const catalog = useCoinCatalog()
catalog.limit.value = 200

const { ticks, watchSymbols } = useCoinStream()
const { overview, holdings, init: initWallet } = useWallet()

// ── COIN SELECTOR ──
// symbol giữ format pair 'BTCUSDT' (compat với order book / chart / orders API)
// baseSymbol là tên gọn 'BTC' (compat với coin.symbol trong DTO mới)
const symbol = ref('BTCUSDT')
const baseSymbol = computed(() => symbol.value.replace(/USDT$/, ''))

// Subscribe stream cho coin đang active + 30 coin top → giá nhảy live
watchSymbols(computed(() => [baseSymbol.value, ...catalog.items.value.slice(0, 30).map(c => c.symbol)]))

function livePrice(base: string, fallback: number): number {
  return ticks.value.get(base)?.price ?? fallback
}
function liveChange(base: string, fallback: number): number {
  return ticks.value.get(base)?.changePercent24h ?? fallback
}

const quickCoins = computed(() =>
  catalog.items.value.map(coin => ({
    id: `${coin.symbol}USDT`,
    icon: coin.icon ?? '',
    label: `${coin.symbol} / USDT`,
    price: livePrice(coin.symbol, coin.price),
    priceChange: liveChange(coin.symbol, coin.changePercent24h)
  }))
)

// ── LIVE PRICE ──
const currentCoin = computed(() => catalog.items.value.find(c => c.symbol === baseSymbol.value))
const currentPrice = computed(() => livePrice(baseSymbol.value, currentCoin.value?.price ?? 0))
const priceChange = computed(() => liveChange(baseSymbol.value, currentCoin.value?.changePercent24h ?? 0))
const priceUp = computed(() => priceChange.value >= 0)

const headerStats = computed(() => {
  const coin = currentCoin.value
  if (!coin) return []
  const change = priceChange.value
  return [
    { label: t('orders.header.change24h'), value: formatChange(change), color: change >= 0 ? 'text-emerald-500' : 'text-red-500' },
    { label: t('orders.header.high24h'), value: '$' + formatPrice(coin.high24h) },
    { label: t('orders.header.low24h'), value: '$' + formatPrice(coin.low24h) },
    { label: t('orders.header.volume'), value: formatVolume(coin.volume24h) },
    { label: t('orders.header.volumeUsdt'), value: '$' + formatVolume(coin.quoteVolume24h) },
    { label: t('orders.header.coin'), value: wallet.value.coinSymbol, color: 'text-amber-500' }
  ]
})

// ── TABS — chart top tabs (value cố định, label dịch reactive)
const topTabItems = computed(() => [
  { label: t('orders.tabs.chart'), value: 'chart' },
  { label: t('orders.tabs.info'), value: 'info' },
  { label: t('orders.tabs.analysis'), value: 'analysis' }
])
const activeTopTab = ref('chart')

// ── WALLET ──
const wallet = computed(() => {
  const coin = baseSymbol.value
  const holding = holdings.value.find(h => h.symbol === coin)
  return {
    cashBalance: overview.value?.cashBalance ?? 0,
    coinBalance: holding ? holding.amount : 0,
    coinSymbol: coin
  }
})

// ── ORDER BOOK ──
const obMode = ref<'both' | 'asks' | 'bids'>('both')
const { start: startOB, stop: stopOB, asks, bids, bestAsk: rawBestAsk, bestBid: rawBestBid, buyRatio, sellRatio } = useOrderBook(symbol)

// Fallback về giá hiện tại nếu sổ lệnh chưa có best bid/ask (vd. coin mới, chưa ai đặt lệnh)
const bestAsk = computed(() => rawBestAsk.value || currentPrice.value)
const bestBid = computed(() => rawBestBid.value || currentPrice.value)

function clickObPrice(p: number) {
  // Giữ tối đa 10 số thập phân để bắt được cả memecoin, loại bỏ các số 0 thừa ở đuôi
  const px = parseFloat(p.toFixed(10))
  buyForm.price.value = px
  sellForm.price.value = px
}

// ── REFS đến các panel/composable con — để gọi refresh sau khi có sự kiện ──
const orderHistoryRef = ref<InstanceType<typeof OrdersHistoryPanel> | null>(null)
const statusBarRef = ref<InstanceType<typeof OrdersStatusBar> | null>(null)
const recentTradesRef = ref<ReturnType<typeof useRecentTrades> | null>(null)

/** Sau khi đặt lệnh thành công: refresh ví/stats/recent-trades + mở panel lịch sử lệnh. */
function onOrderPlaced() {
  initWallet()
  statusBarRef.value?.refresh()
  recentTradesRef.value?.refresh()
  orderHistoryRef.value?.open()
}

/** Khi notification phát hiện lệnh vừa khớp / hủy: refresh ví/stats/recent-trades. */
function onOrderFilled() {
  initWallet()
  statusBarRef.value?.refresh()
  recentTradesRef.value?.refresh()
}

// ── TRADE FORMS — mỗi instance 1 side, toast/side-effect nằm trong composable ──
const buyForm = useTradeForm('buy', symbol, wallet, { onOrderPlaced })
const sellForm = useTradeForm('sell', symbol, wallet, { onOrderPlaced })

// ── SYNC GIÁ BBO khi giá load lần đầu
watch(currentPrice, (p) => {
  if (!buyForm.price.value) buyForm.price.value = parseFloat(p.toFixed(10))
  if (!sellForm.price.value) sellForm.price.value = parseFloat(p.toFixed(10))
}, { immediate: true })

// ── Reset khi đổi coin
watch(symbol, () => {
  buyForm.price.value = 0
  sellForm.price.value = 0
  buyForm.reset()
  sellForm.reset()
})

// ── LIFECYCLE
const route = useRoute()

onMounted(async () => {
  if (route.query.symbol) symbol.value = route.query.symbol as string

  await initWallet()
  await catalog.load()
  startOB()

  await buyForm.loadFeeRate()
  await sellForm.loadFeeRate()

  recentTradesRef.value?.start?.()
})

onUnmounted(() => {
  stopOB()
})
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px)
  }

  to {
    opacity: 1;
    transform: translateY(0)
  }
}

.fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
}
</style>
