<template>
  <UDashboardPanel grow>
    <UDashboardNavbar :title="t('wallets.title')">
      <template #leading>
        <UDashboardSidebarCollapse icon="i-lucide-wallet" />
      </template>
    </UDashboardNavbar>

    <div class="flex-1 overflow-y-auto">
      <div class="w-full mx-auto p-5 space-y-4">
        <!-- ══════════════════════════════════════════════════════════
             HERO CARD
        ══════════════════════════════════════════════════════════ -->
        <div class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="glow-orb" />

          <div class="relative z-10 p-7">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
              <!-- ── [A] Tổng tài sản + Buttons ── -->
              <div class="md:col-span-1 flex flex-col gap-4">
                <div>
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    {{ t('wallets.hero.total_assets') }}
                  </p>
                  <p class="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight tabular-nums leading-none">
                    ${{ formatPrice(stats.totalAssets) }}
                  </p>

                  <!-- Badge lãi/lỗ chưa thực hiện -->
                  <div class="flex items-center gap-1.5 mt-3 flex-wrap">
                    <span
                      :class="[
                        'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg',
                        stats.unrealizedPnl >= 0
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                      ]"
                    >
                      <UIcon
                        :name="stats.unrealizedPnl >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                        class="w-3 h-3"
                      />
                      {{ stats.unrealizedPnl >= 0 ? '+' : '−' }}${{ formatPrice(Math.abs(stats.unrealizedPnl)) }}
                      ({{ stats.unrealizedPnlPct >= 0 ? '+' : '' }}{{ stats.unrealizedPnlPct.toFixed(2) }}%)
                    </span>
                    <span class="text-[10px] text-gray-400">{{ t('wallets.hero.unrealized') }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 flex-wrap mt-auto">
                  <button
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 transition-colors cursor-pointer"
                    @click="showDepositModal = true"
                  >
                    <UIcon
                      name="i-lucide-arrow-down-to-line"
                      class="w-3.5 h-3.5"
                    /> {{ t('wallets.hero.deposit') }}
                  </button>
                  <button
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <UIcon
                      name="i-lucide-arrow-up-from-line"
                      class="w-3.5 h-3.5"
                    /> {{ t('wallets.hero.withdraw') }}
                  </button>
                  <button
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <UIcon
                      name="i-lucide-arrow-right-left"
                      class="w-3.5 h-3.5"
                    /> {{ t('wallets.hero.transfer') }}
                  </button>
                </div>
              </div>

              <!-- ── [B] 3 cột số liệu + Sparkline ── -->
              <div class="md:col-span-3 grid grid-cols-2 gap-4">
                <!-- Box trái: Vốn / Giá TT / Lãi-Lỗ -->
                <div class="bg-linear-to-br from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-violet-200 dark:border-violet-800 space-y-3">
                  <div class="grid grid-cols-3 gap-3">
                    <!-- Tổng vốn gốc -->
                    <div class="flex flex-col gap-1">
                      <span class="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">{{ t('wallets.hero.total_cost') }}</span>
                      <span class="text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-100">${{ formatPrice(stats.totalCost) }}</span>
                      <span class="text-[9px] text-gray-400">{{ t('wallets.hero.total_cost_hint') }}</span>
                    </div>

                    <!-- Giá trị thị trường -->
                    <div class="flex flex-col gap-1">
                      <span class="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">{{ t('wallets.hero.market_value') }}</span>
                      <span class="text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-100">${{ formatPrice(stats.coinsValue) }}</span>
                      <span class="text-[9px] text-gray-400">{{ t('wallets.hero.market_value_hint') }}</span>
                    </div>

                    <!-- Lãi / Lỗ chưa thực hiện -->
                    <div class="flex flex-col gap-1">
                      <span class="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">{{ t('wallets.hero.pnl') }}</span>
                      <span
                        class="text-sm font-semibold tabular-nums"
                        :class="stats.unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'"
                      >
                        {{ stats.unrealizedPnl >= 0 ? '+' : '' }}${{ formatPrice(stats.unrealizedPnl) }}
                      </span>
                      <span
                        class="text-[9px]"
                        :class="stats.unrealizedPnl >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'"
                      >
                        {{ stats.unrealizedPnlPct >= 0 ? '+' : '' }}{{ stats.unrealizedPnlPct.toFixed(2) }}% {{ t('wallets.hero.pnl_unrealized_hint') }}
                      </span>
                    </div>
                  </div>

                  <!-- Hàng dưới: Coin & Số dư -->
                  <div class="grid grid-cols-2 gap-3 pt-3 border-t border-violet-200 dark:border-violet-700">
                    <div class="bg-blue-50/80 dark:bg-blue-900/30 rounded-lg p-2.5 border border-blue-200 dark:border-blue-800/50">
                      <span class="flex items-center gap-1 text-[8px] font-semibold text-blue-500 uppercase tracking-widest">
                        <UIcon
                          name="i-lucide-coins"
                          class="w-2.5 h-2.5"
                        /> {{ t('wallets.hero.coin') }}
                      </span>
                      <p class="text-sm font-semibold text-blue-900 dark:text-blue-100 tabular-nums mt-1">
                        ${{ formatPrice(stats.coinsValue) }}
                      </p>
                      <p class="text-[8px] text-blue-500 mt-0.5">
                        {{ t('wallets.hero.coin_count', { count: liveHoldings.length }) }}
                      </p>
                    </div>
                    <div class="bg-amber-50/80 dark:bg-amber-900/30 rounded-lg p-2.5 border border-amber-200 dark:border-amber-800/50">
                      <span class="flex items-center gap-1 text-[8px] font-semibold text-amber-500 uppercase tracking-widest">
                        <UIcon
                          name="i-lucide-banknote"
                          class="w-2.5 h-2.5"
                        /> {{ t('wallets.hero.available') }}
                      </span>
                      <p class="text-sm font-semibold text-amber-900 dark:text-amber-100 tabular-nums mt-1">
                        ${{ formatPrice(stats.cashBalance) }}
                      </p>
                      <p class="text-[8px] text-amber-500 mt-0.5">
                        {{ t('wallets.hero.available_hint') }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Box phải: Lãi/Lỗ chưa thực hiện theo coin -->
                <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col self-start w-full h-[220px]">
                  <div class="flex items-center justify-between mb-0.5 shrink-0">
                    <span class="text-[11px] font-semibold text-slate-700 dark:text-white">Lãi/Lỗ chưa thực hiện</span>
                    <span
                      v-if="!loading && unrealizedHasData"
                      class="text-[11px] font-semibold tabular-nums"
                      :class="mockUnrealizedTotal >= 0 ? 'text-emerald-500' : 'text-red-500'"
                    >
                      {{ mockUnrealizedTotal >= 0 ? '+' : '' }}${{ formatPrice(mockUnrealizedTotal) }} ròng
                    </span>
                  </div>
                  <p class="text-[9px] text-gray-400 mb-1 shrink-0">
                    So với giá vốn · Xanh = đang lãi · Đỏ = đang lỗ
                  </p>

                  <div
                    v-if="loading"
                    class="flex-1 flex items-center justify-center"
                  >
                    <UIcon
                      name="i-lucide-loader-circle"
                      class="w-4 h-4 animate-spin text-gray-400"
                    />
                  </div>
                  <div
                    v-else-if="!unrealizedHasData"
                    class="flex-1 flex items-center justify-center"
                  >
                    <p class="text-[10px] text-gray-400 text-center">
                      Chưa có coin nào trong ví
                    </p>
                  </div>
                  <ChartsApexChart
                    v-else
                    class="flex-1 min-h-0"
                    type="bar"
                    height="100%"
                    :options="unrealizedOptions"
                    :series="unrealizedSeries"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Allocation bar -->
          <div class="px-7 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div class="flex items-center justify-between mb-2.5 flex-wrap gap-2">
              <span class="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{{ t('wallets.allocation') }}</span>
              <div class="flex items-center gap-4 flex-wrap">
                <div
                  v-for="h in holdingBars"
                  :key="h.symbol"
                  class="flex items-center gap-1.5"
                >
                  <span
                    class="w-2 h-2 rounded-full"
                    :style="{ backgroundColor: h.color }"
                  />
                  <span class="text-[11px] font-medium text-gray-600 dark:text-gray-300">{{ h.symbol }}</span>
                  <span class="text-[11px] text-gray-400 tabular-nums">{{ h.percent }}%</span>
                </div>
              </div>
            </div>
            <div class="alloc-track">
              <div
                v-for="(h, i) in holdingBars"
                :key="i"
                class="h-full transition-all duration-700"
                :class="[i === 0 && 'rounded-l-full', i === holdingBars.length - 1 && 'rounded-r-full']"
                :style="{ width: `${h.percent}%`, backgroundColor: h.color }"
              />
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════
             INFO: Giải thích P&L
        ══════════════════════════════════════════════════════════ -->
        <div class="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl">
          <UIcon
            name="i-lucide-info"
            class="w-4 h-4 text-amber-500 mt-0.5 shrink-0"
          />
          <p class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            <span class="font-bold">{{ t('wallets.info.unrealized') }}</span> {{ t('wallets.info.text_unrealized') }}
            <span class="font-bold">{{ t('wallets.info.cumulative') }}</span> {{ t('wallets.info.text_cumulative') }}
          </p>
        </div>

        <!-- ══════════════════════════════════════════════════════════
             BẢNG TÀI SẢN + DONUT
        ══════════════════════════════════════════════════════════ -->
        <div class="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <!-- Asset table -->
          <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
              <div class="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button
                  v-for="tab in assetTabs"
                  :key="tab.key"
                  :class="[
                    'px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                    activeAssetTab === tab.key
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  ]"
                  @click="activeAssetTab = tab.key"
                >
                  {{ tab.label }}
                </button>
              </div>

              <div class="flex items-center gap-3">
                <div class="relative">
                  <UIcon
                    name="i-lucide-search"
                    class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                  />
                  <input
                    v-model="searchQuery"
                    type="text"
                    :placeholder="t('wallets.search_placeholder')"
                    class="pl-8 pr-3 py-1.5 w-40 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all"
                  >
                </div>
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <span
                    :class="['relative inline-block w-7 h-4 rounded-full transition-colors', hideSmall ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600']"
                    @click="hideSmall = !hideSmall"
                  >
                    <span :class="['absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform', hideSmall ? 'translate-x-3' : 'translate-x-0']" />
                  </span>
                  <span class="text-[11px] text-gray-500">{{ t('wallets.hide_dust') }}</span>
                </label>
              </div>
            </div>

            <WalletList
              :holdings="filteredHoldings"
              @click-coin="goToCoin"
            />
          </div>

          <!-- Donut panel -->
          <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm flex flex-col xl:max-h-[650px]">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-linear-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800/50">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
                  <UIcon
                    name="i-lucide-pie-chart"
                    class="w-5 h-5 text-primary-500"
                  />
                </div>
                <span class="text-sm font-extrabold text-gray-900 dark:text-white">{{ t('wallets.donut.title') }}</span>
              </div>
              <span class="text-[11px] font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-400 px-2.5 py-1 rounded-full">
                {{ t('wallets.hero.coin_count', { count: liveHoldings.length }) }}
              </span>
            </div>
            <div class="px-5 pt-5 shrink-0">
              <div class="bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden p-2">
                <ChartsApexChart
                  type="donut"
                  width="100%"
                  height="160"
                  :options="donutOptions"
                  :series="donutSeries"
                />
              </div>
            </div>
            <div class="px-5 py-4 flex-1 overflow-y-auto min-h-0 space-y-2 ">
              <div
                v-for="(h, i) in liveHoldings"
                :key="h.symbol"
                class="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 cursor-default group"
              >
                <div class="flex items-center gap-3 flex-1">
                  <div class="flex items-center gap-2.5">
                    <span
                      class="w-2.5 h-2.5 rounded-sm shrink-0 shadow-sm"
                      :style="{ backgroundColor: getColorForSymbol(h.symbol) }"
                    />
                    <CoinIcon
                      :symbol="h.symbol"
                      :icon="h.icon"
                      :size="20"
                    />
                  </div>
                  <span class="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ h.symbol }}</span>
                </div>
                <div class="text-right">
                  <div class="text-xs font-semibold tabular-nums text-gray-900 dark:text-white">
                    {{ holdingBars[i]?.percent }}%
                  </div>
                  <div class="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    ${{ formatPrice(h.value) }}
                  </div>
                </div>
              </div>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-800 px-5 py-4 flex items-center justify-between shrink-0 bg-linear-to-r from-primary-50 to-primary-50/50 dark:from-primary-900/10 dark:to-primary-900/5">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-trending-up"
                  class="w-4 h-4 text-primary-500"
                />
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ t('wallets.donut.total_value') }}</span>
              </div>
              <span class="text-lg font-semibold tabular-nums text-primary-600 dark:text-primary-400">${{ formatPrice(stats.coinsValue) }}</span>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════
             GIAO DỊCH GẦN ĐÂY
        ══════════════════════════════════════════════════════════ -->
        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
            <div class="flex items-center gap-3">
              <span class="text-sm font-extrabold text-gray-900 dark:text-white">{{ t('wallets.transactions.title') }}</span>
              <span class="text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 px-2.5 py-0.5 rounded-full">
                {{ transactions.length }}
              </span>
            </div>
            <button class="text-[11px] font-bold text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 uppercase tracking-wide transition-colors">
              {{ t('wallets.transactions.view_all') }} →
            </button>
          </div>
          <div
            v-if="transactions.length"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <div
              v-for="tx in transactions"
              :key="tx.id"
              class="p-5 border-r border-b border-gray-200 dark:border-gray-800 last:border-r-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div :class="['w-7 h-7 rounded-lg flex items-center justify-center', txStyle[tx.type].bg]">
                    <UIcon
                      :name="txIcon[tx.type]"
                      :class="['w-3.5 h-3.5', txStyle[tx.type].text]"
                    />
                  </div>
                  <span :class="['text-[11px] font-semibold uppercase tracking-wide', isIncoming(tx.type) ? 'text-emerald-500' : 'text-red-500']">
                    {{ t(`wallets.transactions.type.${tx.type}`) }}
                  </span>
                </div>
                <span :class="['flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md', tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400']">
                  <UIcon
                    :name="tx.status === 'completed' ? 'i-lucide-check' : 'i-lucide-clock'"
                    class="w-3 h-3"
                  />
                  {{ t(`wallets.transactions.status.${tx.status}`) }}
                </span>
              </div>
              <div class="flex items-center gap-2.5 mb-3">
                <CoinIcon
                  :symbol="tx.symbol"
                  :icon="findCoinIcon(tx.symbol)"
                  :size="32"
                />
                <div>
                  <div class="text-sm font-bold text-gray-900 dark:text-white">
                    {{ tx.symbol }}
                  </div>
                  <div class="text-[10px] text-gray-400 truncate max-w-37.5">
                    {{ tx.note }}
                  </div>
                </div>
              </div>
              <div class="flex items-end justify-between">
                <div>
                  <div :class="['text-sm font-semibold tabular-nums', isIncoming(tx.type) ? 'text-emerald-500' : 'text-red-500']">
                    {{ isIncoming(tx.type) ? '+' : '−' }}{{ formatPrice(tx.amount) }} {{ tx.symbol }}
                  </div>
                  <div class="text-[11px] text-gray-400">
                    ${{ formatPrice(tx.total) }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-[11px] text-gray-500">
                    {{ tx.time }}
                  </div>
                  <div class="text-[10px] text-gray-400">
                    {{ tx.date }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ModalDepositMethod
      v-model:open="showDepositModal"
      @select-method="handleSelectMethod"
    />
    <ModalRecharge
      v-model:open="showRechargeModal"
      :wallet="{ cashBalance: stats.cashBalance, coinBalance: 0, coinSymbol: 'BNB' }"
      @deposited="handleDeposited"
    />
  </UDashboardPanel>
</template>

<script lang="ts" setup>
import { format, subDays } from 'date-fns'
import ModalDepositMethod from '~/components/wallets/modal-deposit-method.vue'
import ModalRecharge from '~/components/wallets/modal-recharge.vue'
import WalletList from '~/components/wallets/wallet-list.vue'
import CoinIcon from '~/components/coins/CoinIcon.vue'
import type { ApexOptions } from 'apexcharts'
import type { Holding, TransactionType } from '../../../server/dtos/wallet'

const { t } = useI18n()
const { goToCoin } = useNavigateToCoin()
const colorMode = useColorMode()

// ── DATA: useWallet (composable) + useCoinStream (live overlay) ──
// DESTRUCTURE refs về top-level → template tự unwrap, script vẫn dùng .value bình thường.
const { overview, holdings, transactions, loading, init, loadChart } = useWallet()
const { ticks, watchSymbols } = useCoinStream()

// Symbol đang giữ → subscribe stream giá live (auto re-subscribe khi mua/bán coin mới)
const heldSymbols = computed(() => holdings.value.map(h => h.symbol))
watchSymbols(heldSymbols)

onMounted(async () => {
  await init()
  // Set range 7 ngày cho sparkline
  const to = format(new Date(), 'yyyy-MM-dd')
  const from = format(subDays(new Date(), 6), 'yyyy-MM-dd')
  await loadChart({ period: 'daily', from, to })
})

// ── UI state ──
const searchQuery = ref('')
const hideSmall = ref(false)
const activeAssetTab = ref<'by_coin' | 'by_wallet'>('by_coin')
const showDepositModal = ref(false)
const showRechargeModal = ref(false)
const selectedMethod = ref<unknown>(null)

const assetTabs = computed(() => [
  { key: 'by_coin' as const, label: t('wallets.asset_tabs.by_coin') },
  { key: 'by_wallet' as const, label: t('wallets.asset_tabs.by_wallet') }
])

// ── Holdings có giá live phủ lên giá DB ──
const liveHoldings = computed<Holding[]>(() =>
  holdings.value.map((h) => {
    const tick = ticks.value.get(h.symbol)
    const currentPrice = tick?.price ?? h.currentPrice
    const value = h.amount * currentPrice
    const pnl = h.amount * (currentPrice - h.avgBuyPrice)
    const pnlPercent = h.avgBuyPrice > 0 ? ((currentPrice - h.avgBuyPrice) / h.avgBuyPrice) * 100 : 0
    return { ...h, currentPrice, value, pnl, pnlPercent }
  })
)

// ── Portfolio stats — dùng DTO BE-computed + live overlay ──
const stats = computed(() => {
  const cashBalance = overview.value?.cashBalance ?? 0
  const coinsValue = liveHoldings.value.reduce((s, h) => s + h.value, 0)
  const totalCost = liveHoldings.value.reduce((s, h) => s + h.amount * h.avgBuyPrice, 0)
  const unrealizedPnl = coinsValue - totalCost
  const unrealizedPnlPct = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0
  return {
    cashBalance,
    coinsValue,
    totalCost,
    unrealizedPnl,
    unrealizedPnlPct,
    totalAssets: cashBalance + coinsValue
  }
})

// ── Filter holdings cho asset table ──
const filteredHoldings = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return liveHoldings.value.filter(h =>
    (h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q))
    && (!hideSmall.value || h.value >= 1)
  )
})

// ── Allocation bars + donut ──
function getColorForSymbol(symbol: string): string {
  const KNOWN: Record<string, string> = {
    BTC: '#F7931A', ETH: '#627EEA', BNB: '#F3BA2F', SOL: '#9945FF', XRP: '#00AAE4',
    DOGE: '#BA9F33', ADA: '#0033AD', AVAX: '#E84142', DOT: '#E6007A',
    MATIC: '#8247E5', POL: '#8247E5', LINK: '#2A5ADA', TRX: '#FF060A'
  }
  if (KNOWN[symbol]) return KNOWN[symbol]
  // Hash → HSL — màu ổn định theo symbol
  let h = 0
  for (const ch of symbol) h = (h * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${h} 60% 45%)`
}

const holdingBars = computed(() => {
  const total = stats.value.coinsValue
  if (!total) return []
  return liveHoldings.value.map(h => ({
    symbol: h.symbol,
    percent: +((h.value / total) * 100).toFixed(1),
    color: getColorForSymbol(h.symbol)
  }))
})

// ── Lãi/Lỗ chưa thực hiện theo coin (DATA THẬT từ liveHoldings) ──
// Diverging horizontal bar — mỗi coin một thanh, trục 0 ở giữa.
// Xanh chìa phải = đang LÃI $ · Đỏ chìa trái = đang LỖ $.
// Lấy TOP 6 coin theo |P&L| (coin nhỏ xíu lọt vào sẽ làm chart loãng), sort desc.
const TOP_UNREALIZED = 6
const unrealizedData = computed(() => {
  return [...liveHoldings.value]
    .filter(h => h.amount > 0)
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, TOP_UNREALIZED)
    .sort((a, b) => b.pnl - a.pnl)
    .map(h => ({ sym: h.symbol, pnl: +h.pnl.toFixed(2) }))
})

const unrealizedHasData = computed(() => unrealizedData.value.length > 0)
const mockUnrealizedTotal = computed(() =>
  liveHoldings.value.reduce((s, h) => s + h.pnl, 0)
)
const unrealizedSeries = computed(() => [{
  name: 'Unrealized',
  data: unrealizedData.value.map(d => d.pnl)
}])
const unrealizedOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'bar' as const,
    background: 'transparent',
    toolbar: { show: false },
    animations: {
      enabled: true,
      speed: 900,
      animateGradually: { enabled: true, delay: 90 },
      dynamicAnimation: { enabled: true, speed: 400 }
    }
  },
  plotOptions: {
    bar: {
      horizontal: true,
      barHeight: '58%',
      borderRadius: 3,
      borderRadiusApplication: 'end' as const,
      colors: {
        ranges: [
          { from: -1e12, to: -0.0001, color: '#ef4444' },
          { from: 0, to: 1e12, color: '#10b981' }
        ]
      }
    }
  },
  dataLabels: {
    enabled: true,
    style: { fontSize: '9px', colors: ['#ffffff'], fontWeight: 700 },
    formatter: (v: number) => `${v >= 0 ? '+' : ''}$${Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)}`
  },
  legend: { show: false },
  grid: {
    show: true,
    borderColor: 'rgba(148,163,184,0.12)',
    strokeDashArray: 3,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: false } },
    padding: { top: -12, right: 4, bottom: -8, left: -4 }
  },
  xaxis: {
    categories: unrealizedData.value.map(d => d.sym),
    labels: {
      style: { colors: '#94a3b8', fontSize: '9px' },
      formatter: (v: string) => {
        const n = Number(v)
        if (Math.abs(n) >= 1000) return `${n >= 0 ? '' : '-'}$${Math.abs(n / 1000).toFixed(0)}k`
        return `${n >= 0 ? '' : '-'}$${Math.abs(n)}`
      }
    },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: { style: { colors: '#94a3b8', fontSize: '10px', fontWeight: 600 } }
  },
  tooltip: {
    theme: 'dark',
    y: {
      formatter: (v: number) => `${v >= 0 ? 'Đang lãi +' : 'Đang lỗ -'}$${Math.abs(v).toLocaleString()}`,
      title: { formatter: () => '' }
    }
  }
}))

// ── Donut ──
const donutSeries = computed(() => liveHoldings.value.map(h => +h.value.toFixed(2)))
const donutOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'donut' as const,
    background: 'transparent',
    animations: { enabled: false }, // ← Tắt animation tick-by-tick khi giá WS đổi
    toolbar: { show: false }
  },
  labels: liveHoldings.value.map(h => h.symbol),
  colors: liveHoldings.value.map(h => getColorForSymbol(h.symbol)),
  plotOptions: {
    pie: {
      // Slice không bật ra khi hover → bớt giật
      expandOnClick: false,
      donut: {
        size: '70%',
        labels: {
          show: true,
          total: {
            show: true, showAlways: true,
            label: t('wallets.donut.total_nav'),
            fontSize: '11px',
            color: colorMode.value === 'dark' ? 'rgb(107,114,128)' : 'rgb(17,24,39)',
            formatter: () => `$${formatPrice(stats.value.coinsValue)}`
          },
          value: {
            fontSize: '15px', fontWeight: 700, offsetY: 4,
            color: colorMode.value === 'dark' ? 'rgb(243,244,246)' : 'rgb(17,24,39)',
            formatter: (v: number) => `$${Number(v).toFixed(2)}`
          }
        }
      }
    }
  },
  // Bỏ hiệu ứng nhấp nháy khi hover qua slice
  states: {
    hover: { filter: { type: 'none' } },
    active: { filter: { type: 'none' } }
  },
  dataLabels: { enabled: false },
  legend: { show: false },
  stroke: { show: true, width: 2, colors: [colorMode.value === 'dark' ? 'rgb(17,24,39)' : '#fff'] },
  tooltip: { enabled: true, theme: 'dark', y: { formatter: (v: number) => `$${formatPrice(v)}` } }
}))

// ── Transactions ──
const txIcon: Record<TransactionType, string> = {
  buy: 'i-lucide-arrow-down-to-line',
  sell: 'i-lucide-arrow-up-from-line',
  deposit: 'i-lucide-arrow-down-left',
  withdraw: 'i-lucide-arrow-up-right'
}
const txStyle: Record<TransactionType, { bg: string, text: string }> = {
  buy: { bg: 'bg-emerald-600/10', text: 'text-emerald-600 dark:text-emerald-400' },
  sell: { bg: 'bg-red-600/10', text: 'text-red-600 dark:text-red-400' },
  deposit: { bg: 'bg-blue-600/10', text: 'text-blue-600 dark:text-blue-400' },
  withdraw: { bg: 'bg-amber-600/10', text: 'text-amber-600 dark:text-amber-400' }
}
function isIncoming(type: TransactionType): boolean {
  return type === 'buy' || type === 'deposit'
}

// Tra icon coin từ holdings (đã có data) cho recent transactions hiển thị
function findCoinIcon(symbol: string): string | null {
  return holdings.value.find(h => h.symbol === symbol)?.icon ?? null
}

// ── Modal handlers ──
function handleSelectMethod(method: unknown) {
  selectedMethod.value = method
  showRechargeModal.value = true
}
async function handleDeposited() {
  await init()
}
</script>

<style scoped>
.glow-orb {
  position: absolute;
  width: 300px;
  height: 300px;
  top: -80px;
  left: -40px;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
}

.alloc-track {
  display: flex;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  gap: 2px;
  background: rgba(0, 0, 0, 0.05);
}
</style>
