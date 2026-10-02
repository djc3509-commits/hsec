<template>
  <UDashboardPanel id="markets">
    <!-- HEADER (sticky top): Navbar + Ticker -->
    <template #header>
      <UDashboardNavbar :title="t('markets.title')">
        <template #leading>
          <UDashboardSidebarCollapse icon="i-heroicons-chart-bar-square" />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              color="primary"
              variant="ghost"
              icon="i-heroicons-magnifying-glass"
              size="sm"
            />
            <UButton
              color="primary"
              variant="ghost"
              icon="i-heroicons-bell"
              size="sm"
            />
            <UButton
              color="primary"
              size="sm"
              :label="t('markets.trade_button')"
              icon="i-heroicons-arrow-trending-up"
            />
          </div>
        </template>
      </UDashboardNavbar>

      <!-- TICKER (top 10 rank) -->
      <div class="ticker-wrapper border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 overflow-hidden">
        <div class="ticker-track flex items-center">
          <div
            v-for="(coin, i) in [...tickerCoins, ...tickerCoins]"
            :key="`tick-${i}`"
            class="flex items-center gap-2 px-5 py-1.5 shrink-0 border-r border-gray-200 dark:border-gray-800 min-w-fit"
          >
            <CoinIcon
              :symbol="coin.symbol"
              :icon="coin.icon"
              :size="16"
            />
            <span class="text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-10">{{ coin.symbol }}</span>
            <span
              class="text-sm font-semibold min-w-14 text-right transition-colors duration-300 tabular-nums"
              :class="liveColor(coin.symbol)"
            >
              {{ formatPrice(livePrice(coin.symbol, coin.price)) }}
            </span>
            <span
              class="text-xs font-semibold min-w-16 text-right px-1.5 py-0.5 rounded tabular-nums"
              :class="liveChange(coin.symbol, coin.changePercent24h) >= 0
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'"
            >
              {{ formatChange(liveChange(coin.symbol, coin.changePercent24h)) }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- BODY -->
    <template #body>
      <div class="w-full mx-auto p-6 space-y-8">
        <!-- HEADER + TABS -->
        <div
          class="space-y-4 fade-in-left"
          style="animation-delay: 50ms"
        >
          <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ t('markets.title') }}
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                {{ t('markets.subtitle') }} · {{ t('markets.live') }}
                <UIcon
                  name="i-lucide-zap"
                  class="w-3.5 h-3.5 text-amber-500"
                />
              </p>
            </div>
            <div class="flex items-center gap-5 text-xs text-gray-500 dark:text-gray-400">
              <div class="flex flex-col items-end">
                <span>{{ t('markets.stats.market_cap') }}</span>
                <span class="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{{ marketStats.marketCap }}</span>
              </div>
              <div class="w-px h-8 bg-gray-200 dark:bg-gray-700" />
              <div class="flex flex-col items-end">
                <span>{{ t('markets.stats.volume_24h') }}</span>
                <span class="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{{ marketStats.volume24h }}</span>
              </div>
              <div class="w-px h-8 bg-gray-200 dark:bg-gray-700" />
              <div class="flex flex-col items-end">
                <span>{{ t('markets.stats.btc_dominance') }}</span>
                <span class="text-sm font-semibold tabular-nums text-emerald-500">{{ marketStats.btcDominance }}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-1 border-b border-gray-200 dark:border-gray-800">
            <button
              v-for="tab in mainTabs"
              :key="tab.key"
              class="px-4 py-2.5 text-sm font-medium transition-colors relative"
              :class="activeTab === tab.key ? 'text-primary-500 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
              <span
                v-if="tab.badge"
                class="ml-1.5 bg-primary-500 text-white text-[10px] px-1.5 py-0.5 rounded-full"
              >{{ tab.badge }}</span>
              <span
                v-if="activeTab === tab.key"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t"
              />
            </button>
          </div>
        </div>

        <!-- TOP 4 CARDS -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-container"
          style="--stagger-delay: 60ms"
        >
          <div
            v-for="(card, idx) in coinCards"
            :key="card.title"
            class="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow stagger-item"
            :style="{ '--stagger-index': idx }"
          >
            <div class="flex justify-between items-center mb-4">
              <span class="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                <UIcon
                  :name="card.icon"
                  :class="['w-4 h-4', card.iconColor]"
                />
                {{ card.title }}
              </span>
              <button class="text-xs text-primary-500 hover:text-primary-600 font-medium">
                {{ t('markets.view_more') }} →
              </button>
            </div>
            <div class="space-y-3">
              <div
                v-for="coin in card.coins"
                :key="coin.symbol"
                class="flex items-center gap-2 group cursor-pointer"
                @click="goToCoin(coin.symbol)"
              >
                <CoinIcon
                  :symbol="coin.symbol"
                  :icon="coin.icon"
                  :size="24"
                />
                <span class="flex-1 text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">{{ coin.symbol }}</span>
                <span
                  class="text-sm font-semibold transition-colors duration-300 tabular-nums"
                  :class="liveColor(coin.symbol)"
                >
                  {{ formatPrice(livePrice(coin.symbol, coin.price)) }}
                </span>
                <span
                  class="text-xs font-semibold px-1.5 py-0.5 rounded tabular-nums"
                  :class="liveChange(coin.symbol, coin.changePercent24h) >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'"
                >
                  {{ formatChange(liveChange(coin.symbol, coin.changePercent24h)) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- FILTER BAR -->
        <div class="space-y-3">
          <div class="flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
            <button
              v-for="f in quickFilters"
              :key="f.key"
              class="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all"
              :class="marketState.filter.mode === f.key ? f.activeClass : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'"
              @click="marketState.filter.mode = f.key"
            >
              <UIcon
                :name="f.icon"
                class="w-3.5 h-3.5"
              />
              {{ f.label }}
            </button>
          </div>

          <div class="flex gap-3 items-center justify-between">
            <div class="relative">
              <UIcon
                name="i-heroicons-magnifying-glass"
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              />
              <input
                v-model="marketState.filter.search"
                type="text"
                :placeholder="t('markets.search_placeholder')"
                class="pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
              >
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ t('markets.token_count', { count: marketState.list.pagination.count }) }}</span>
          </div>
        </div>

        <!-- MARKET TABLE -->
        <MarketTable
          :coins="marketState.list.data"
          @click-coin="goToCoin"
        />
      </div>
    </template>

    <!-- FOOTER (sticky bottom) -->
    <template #footer>
      <div class="flex border-t border-default px-3 w-full py-2 items-center gap-2">
        <SharedModulePagination
          class="ml-auto"
          :loading="marketState.loading"
          :pagination="marketState.list.pagination"
          @update:limit="marketState.param.limit = $event; marketState.param.page = 1"
          @update:page="marketState.param.page = $event"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import MarketTable from '~/components/markets/MarketTable.vue'
import CoinIcon from '~/components/coins/CoinIcon.vue'
import type { Coin } from '../../../server/dtos/coin'

const { t } = useI18n()
const { goToCoin } = useNavigateToCoin()

type FilterMode = 'all' | 'gainers' | 'losers'

// ── STATE: gom 1 reactive object kiểu LenBox ──
const marketState = reactive({
  param: { page: 1, limit: 20 },
  filter: { search: '', mode: 'all' as FilterMode },
  list: {
    data: [] as Coin[],
    pagination: { count: 0, page: 1, limit: 20, totalPage: 0 }
  },
  loading: false
})

// ── DATA: catalog (DB) + stream (live overlay) ──
const catalog = useCoinCatalog()
catalog.limit.value = 200

const { ticks, watchSymbols } = useCoinStream()
watchSymbols(computed(() => catalog.items.value.map(c => c.symbol)))

onMounted(async () => {
  marketState.loading = true
  try {
    await catalog.load()
  } finally {
    marketState.loading = false
  }
})

// ── Live readers ──
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
  return 'text-gray-600 dark:text-gray-400'
}

// ── Quick filters (label tự dịch theo locale) ──
const quickFilters = computed<{ key: FilterMode, label: string, icon: string, activeClass: string }[]>(() => [
  { key: 'all', label: t('markets.filters.all'), icon: 'i-lucide-flame', activeClass: 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' },
  { key: 'gainers', label: t('markets.filters.gainers'), icon: 'i-lucide-trending-up', activeClass: 'bg-emerald-500 text-white' },
  { key: 'losers', label: t('markets.filters.losers'), icon: 'i-lucide-trending-down', activeClass: 'bg-red-500 text-white' }
])

// ── Filter + sort cục bộ ──
const filteredList = computed<Coin[]>(() => {
  const src = catalog.items.value
  if (!src.length) return []
  let list = [...src]

  const q = marketState.filter.search.trim().toLowerCase()
  if (q) {
    list = list.filter(c =>
      c.symbol.toLowerCase().includes(q)
      || c.name.toLowerCase().includes(q)
    )
  }

  if (marketState.filter.mode === 'gainers') {
    return list.filter(c => c.changePercent24h > 0)
      .sort((a, b) => b.changePercent24h - a.changePercent24h)
  }
  if (marketState.filter.mode === 'losers') {
    return list.filter(c => c.changePercent24h < 0)
      .sort((a, b) => a.changePercent24h - b.changePercent24h)
  }
  return list.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
})

watch(() => [marketState.filter.search, marketState.filter.mode], () => {
  marketState.param.page = 1
})

watch(
  () => [filteredList.value, marketState.param.page, marketState.param.limit] as const,
  ([list, page, limit]) => {
    const count = list.length
    const totalPage = Math.max(1, Math.ceil(count / limit))
    const safePage = Math.min(page, totalPage)
    const start = (safePage - 1) * limit
    marketState.list.data = list.slice(start, start + limit)
    marketState.list.pagination = { count, page: safePage, limit, totalPage }
  },
  { immediate: true }
)

// ── Ticker (top 10) ──
const tickerCoins = computed(() =>
  [...catalog.items.value].sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999)).slice(0, 10)
)

// ── Top 4 cards (label tự dịch) ──
const coinCards = computed(() => {
  const list = catalog.items.value
  if (!list.length) return []
  const byRank = [...list].sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
  const gainers = [...list].sort((a, b) => b.changePercent24h - a.changePercent24h)
  const losers = [...list].sort((a, b) => a.changePercent24h - b.changePercent24h)
  const byVolume = [...list].sort((a, b) => b.quoteVolume24h - a.quoteVolume24h)
  return [
    { title: t('markets.cards.popular'), icon: 'i-lucide-flame', iconColor: 'text-orange-500', coins: byRank.slice(0, 4) },
    { title: t('markets.cards.top_gainers'), icon: 'i-lucide-trending-up', iconColor: 'text-emerald-500', coins: gainers.slice(0, 4) },
    { title: t('markets.cards.top_losers'), icon: 'i-lucide-trending-down', iconColor: 'text-red-500', coins: losers.slice(0, 4) },
    { title: t('markets.cards.top_volume'), icon: 'i-lucide-bar-chart-3', iconColor: 'text-violet-500', coins: byVolume.slice(0, 4) }
  ]
})

// ── Stats tổng thị trường ──
const marketStats = computed(() => {
  const list = catalog.items.value
  if (!list.length) return { marketCap: '—', volume24h: '—', btcDominance: '—' }
  const totalMcap = list.reduce((s, c) => s + c.marketCap, 0)
  const totalVol = list.reduce((s, c) => s + c.quoteVolume24h, 0)
  const btc = list.find(c => c.symbol === 'BTC')
  const dominance = btc && totalMcap > 0 ? (btc.marketCap / totalMcap) * 100 : 0
  return {
    marketCap: '$' + formatVolume(totalMcap),
    volume24h: '$' + formatVolume(totalVol),
    btcDominance: dominance.toFixed(2) + '%'
  }
})

// ── Tabs (label tự dịch) ──
const activeTab = ref('crypto')
const mainTabs = computed(() => [
  { key: 'watchlist', label: t('markets.tabs.watchlist') },
  { key: 'crypto', label: t('markets.tabs.crypto') },
  { key: 'spot', label: t('markets.tabs.spot') },
  { key: 'futures', label: t('markets.tabs.futures') },
  { key: 'alpha', label: t('markets.tabs.alpha'), badge: t('markets.new_badge') },
  { key: 'new', label: t('markets.tabs.new') },
  { key: 'zone', label: t('markets.tabs.zone') }
])
</script>

<style scoped>
.ticker-wrapper { height: 34px; position: relative; overflow: hidden; }
.ticker-track { position: absolute; white-space: nowrap; animation: ticker-scroll 40s linear infinite; }
.ticker-wrapper:hover .ticker-track { animation-play-state: paused; }
@keyframes ticker-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes fadeInLeft  { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }

.fade-in-left  { animation: fadeInLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; opacity: 0; }
.stagger-container { --stagger-delay: 60ms; }
.stagger-item {
  --stagger-index: 0;
  animation: fadeInScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  animation-delay: calc(var(--stagger-index) * var(--stagger-delay) + 100ms);
  opacity: 0;
}
</style>
