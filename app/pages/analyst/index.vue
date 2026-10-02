<!--
  /analyst — AI Analyst (production v2).
  - UPopover coin picker (style giống orders/coin-selector)
  - Diverse input: USlider, USelect, UPopover, UTextarea
  - Free-text "Yêu cầu thêm" — AI sẽ tham chiếu trong narrative
  - Big "Đóng báo cáo" sticky
  - Loading effect mới: orbit icons + progress bar + sub-text
  - Dark/light auto. KHÔNG emoji — chỉ UIcon.
-->
<script setup lang="ts">
import type { AnalystInput, Horizon, RiskLevel, Experience, Goal, Style, Depth, InfoType, Tone, StopLossKind, Leverage, MarketBias, EntryStrategy } from '../../../server/dtos/analyst'

definePageMeta({ layout: false })

const { t, locale, setLocale } = useI18n()

// Đổi nhanh ngôn ngữ EN ⇄ VI ngay trong trang phân tích.
function toggleLocale() {
  setLocale(locale.value === 'vi' ? 'en' : 'vi')
}

const { result, loading, error, currentStep, progress, steps, saving, saved, saveError, runAnalyze, saveReport, reset } = useAnalyst()
const catalog = useCoinCatalog()
const colorMode = useColorMode()
const toast = useToast()

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// ─── Form state ──────────────────────────────────────────────
const symbol = ref('BTC')
const amount = ref(1000)
const risk = ref<RiskLevel>('mid')
const horizon = ref<Horizon>('swing')
const experience = ref<Experience>('intermediate')
const goal = ref<Goal>('profit')
const style = ref<Style>('trend')
const maxRiskPct = ref(5)
const reportDepth = ref<Depth>('medium')
const customRequest = ref('')

// ── Round 2 new fields ──────────────────────────────────────
const tone = ref<Tone>('professional')
const stopLossKind = ref<StopLossKind>('hard')
const profitTargetPct = ref(10)

// ── Round 3 advanced fields ─────────────────────────────────
const leverage = ref<Leverage>('spot')
const marketBias = ref<MarketBias>('unsure')
const entryStrategy = ref<EntryStrategy>('market')
const compareSymbol = ref<string | null>(null)
const interestTags = ref<string[]>([])
const excludeTags = ref<string[]>([])
const newInterest = ref('')
const newExclude = ref('')

function addTag(target: 'interest' | 'exclude') {
  const ref$ = target === 'interest' ? newInterest : newExclude
  const arr = target === 'interest' ? interestTags : excludeTags
  const v = ref$.value.trim()
  if (!v || arr.value.includes(v) || arr.value.length >= 10) {
    ref$.value = ''
    return
  }
  arr.value.push(v)
  ref$.value = ''
}
function removeTag(target: 'interest' | 'exclude', i: number) {
  const arr = target === 'interest' ? interestTags : excludeTags
  arr.value.splice(i, 1)
}

const infoTypes = reactive<Record<InfoType, boolean>>({
  technical: true,
  fundamental: true,
  news: true,
  sentiment: true,
  onchain: false,
  events: false
})

// ─── Catalog load ────────────────────────────────────────────
onMounted(() => {
  catalog.limit.value = 200
  catalog.load()
})

const currentCoin = computed(() => catalog.items.value.find(c => c.symbol === symbol.value))

// ─── Coin picker (UPopover) ──────────────────────────────────
const coinPopoverOpen = ref(false)
const coinSearch = ref('')
const filteredCoins = computed(() => {
  const q = coinSearch.value.trim().toLowerCase()
  if (!q) return catalog.items.value.slice(0, 100)
  return catalog.items.value.filter(c =>
    c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
  ).slice(0, 100)
})
function selectCoin(sym: string) {
  symbol.value = sym
  coinPopoverOpen.value = false
  coinSearch.value = ''
}

// ─── Options ─────────────────────────────────────────────────
const RISK_ITEMS = computed(() => [
  { value: 'low', label: t('analyst.form.risk.low.label'), note: t('analyst.form.risk.low.note'), icon: 'i-lucide-shield', color: 'text-emerald-600', border: 'border-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { value: 'mid', label: t('analyst.form.risk.mid.label'), note: t('analyst.form.risk.mid.note'), icon: 'i-lucide-scale', color: 'text-amber-600', border: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { value: 'high', label: t('analyst.form.risk.high.label'), note: t('analyst.form.risk.high.note'), icon: 'i-lucide-flame', color: 'text-orange-600', border: 'border-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { value: 'degen', label: t('analyst.form.risk.degen.label'), note: t('analyst.form.risk.degen.note'), icon: 'i-lucide-rocket', color: 'text-red-600', border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-950/30' }
])

const LEVERAGE_ITEMS = computed(() => [
  { value: 'spot', label: 'Spot', note: t('analyst.form.leverage.spot.note') },
  { value: 'x2', label: '2x', note: t('analyst.form.leverage.x2.note') },
  { value: 'x3', label: '3x', note: t('analyst.form.leverage.x3.note') },
  { value: 'x5', label: '5x', note: t('analyst.form.leverage.x5.note') },
  { value: 'x10', label: '10x', note: t('analyst.form.leverage.x10.note') },
  { value: 'x20', label: '20x', note: t('analyst.form.leverage.x20.note') }
])

const MARKET_BIAS_ITEMS = computed(() => [
  { value: 'bull', label: t('analyst.form.marketBias.bull.label'), desc: t('analyst.form.marketBias.bull.desc'), icon: 'i-lucide-trending-up' },
  { value: 'bear', label: t('analyst.form.marketBias.bear.label'), desc: t('analyst.form.marketBias.bear.desc'), icon: 'i-lucide-trending-down' },
  { value: 'crab', label: t('analyst.form.marketBias.crab.label'), desc: t('analyst.form.marketBias.crab.desc'), icon: 'i-lucide-move-horizontal' },
  { value: 'unsure', label: t('analyst.form.marketBias.unsure.label'), desc: t('analyst.form.marketBias.unsure.desc'), icon: 'i-lucide-help-circle' }
])

const ENTRY_STRATEGY_ITEMS = computed(() => [
  { value: 'market', label: 'Market', desc: t('analyst.form.entry.market.desc'), icon: 'i-lucide-zap' },
  { value: 'limit', label: 'Limit', desc: t('analyst.form.entry.limit.desc'), icon: 'i-lucide-crosshair' },
  { value: 'scale', label: 'Scale-in', desc: t('analyst.form.entry.scale.desc'), icon: 'i-lucide-layers' },
  { value: 'breakout', label: 'Breakout', desc: t('analyst.form.entry.breakout.desc'), icon: 'i-lucide-flag-triangle-right' }
])

const EXPERIENCE_ITEMS = computed(() => [
  { value: 'beginner', label: t('analyst.form.experience.beginner.label'), desc: t('analyst.form.experience.beginner.desc'), icon: 'i-lucide-baby' },
  { value: 'intermediate', label: t('analyst.form.experience.intermediate.label'), desc: t('analyst.form.experience.intermediate.desc'), icon: 'i-lucide-user' },
  { value: 'pro', label: t('analyst.form.experience.pro.label'), desc: t('analyst.form.experience.pro.desc'), icon: 'i-lucide-crown' }
])

const TONE_ITEMS = computed(() => [
  { value: 'professional', label: t('analyst.form.tone.professional.label'), icon: 'i-lucide-briefcase', desc: t('analyst.form.tone.professional.desc') },
  { value: 'friendly', label: t('analyst.form.tone.friendly.label'), icon: 'i-lucide-smile', desc: t('analyst.form.tone.friendly.desc') },
  { value: 'strict', label: t('analyst.form.tone.strict.label'), icon: 'i-lucide-octagon-alert', desc: t('analyst.form.tone.strict.desc') }
])

const STOP_LOSS_ITEMS = computed(() => [
  { value: 'hard', label: t('analyst.form.stopLoss.hard.label'), icon: 'i-lucide-anchor', desc: t('analyst.form.stopLoss.hard.desc') },
  { value: 'trailing', label: t('analyst.form.stopLoss.trailing.label'), icon: 'i-lucide-rewind', desc: t('analyst.form.stopLoss.trailing.desc') },
  { value: 'mental', label: t('analyst.form.stopLoss.mental.label'), icon: 'i-lucide-brain', desc: t('analyst.form.stopLoss.mental.desc') }
])

const HORIZON_ITEMS = computed(() => [
  { value: 'scalp', label: 'Scalp', note: t('analyst.form.horizon.scalp.note'), icon: 'i-lucide-zap', sl: 1.5, tp: 2.5 },
  { value: 'day', label: 'Day Trade', note: t('analyst.form.horizon.day.note'), icon: 'i-lucide-sun', sl: 3.0, tp: 5.0 },
  { value: 'swing', label: 'Swing', note: t('analyst.form.horizon.swing.note'), icon: 'i-lucide-calendar', sl: 5.0, tp: 10.0 },
  { value: 'position', label: 'Position', note: t('analyst.form.horizon.position.note'), icon: 'i-lucide-trending-up', sl: 10.0, tp: 30.0 }
])

// Goal qua UPopover (đồng cao với Style)
const GOAL_ITEMS = computed(() => [
  { value: 'learn', label: t('analyst.form.goal.learn.label'), desc: t('analyst.form.goal.learn.desc'), icon: 'i-lucide-graduation-cap' },
  { value: 'profit', label: t('analyst.form.goal.profit.label'), desc: t('analyst.form.goal.profit.desc'), icon: 'i-lucide-zap' },
  { value: 'invest', label: t('analyst.form.goal.invest.label'), desc: t('analyst.form.goal.invest.desc'), icon: 'i-lucide-trending-up' },
  { value: 'preserve', label: t('analyst.form.goal.preserve.label'), desc: t('analyst.form.goal.preserve.desc'), icon: 'i-lucide-shield' }
])
const goalPopoverOpen = ref(false)
const currentGoal = computed(() => GOAL_ITEMS.value.find(g => g.value === goal.value)!)

// Compare coin (UPopover optional)
const comparePopoverOpen = ref(false)
const compareSearch = ref('')
const filteredCompareCoins = computed(() => {
  const q = compareSearch.value.trim().toLowerCase()
  const base = catalog.items.value.filter(c => c.symbol !== symbol.value)
  if (!q) return base.slice(0, 50)
  return base.filter(c =>
    c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
  ).slice(0, 50)
})
const currentCompareCoin = computed(() => compareSymbol.value ? catalog.items.value.find(c => c.symbol === compareSymbol.value) : null)
function selectCompareCoin(sym: string | null) {
  compareSymbol.value = sym
  comparePopoverOpen.value = false
  compareSearch.value = ''
}

// Style qua UPopover (rich content)
const STYLE_ITEMS = computed(() => [
  { value: 'momentum', label: t('analyst.form.style.momentum.label'), desc: t('analyst.form.style.momentum.desc'), icon: 'i-lucide-rocket' },
  { value: 'reversal', label: t('analyst.form.style.reversal.label'), desc: t('analyst.form.style.reversal.desc'), icon: 'i-lucide-undo-2' },
  { value: 'trend', label: t('analyst.form.style.trend.label'), desc: t('analyst.form.style.trend.desc'), icon: 'i-lucide-trending-up' },
  { value: 'dca', label: t('analyst.form.style.dca.label'), desc: t('analyst.form.style.dca.desc'), icon: 'i-lucide-repeat' }
])
const stylePopoverOpen = ref(false)
const currentStyle = computed(() => STYLE_ITEMS.value.find(s => s.value === style.value)!)

const DEPTH_ITEMS = computed(() => [
  { value: 'short', label: t('analyst.form.depth.short.label'), desc: t('analyst.form.depth.short.desc') },
  { value: 'medium', label: t('analyst.form.depth.medium.label'), desc: t('analyst.form.depth.medium.desc') },
  { value: 'long', label: t('analyst.form.depth.long.label'), desc: t('analyst.form.depth.long.desc') }
])

const INFO_TYPE_ITEMS = computed<Array<{ key: InfoType, label: string, icon: string }>>(() => [
  { key: 'technical', label: t('analyst.form.infoType.technical'), icon: 'i-lucide-bar-chart-3' },
  { key: 'fundamental', label: t('analyst.form.infoType.fundamental'), icon: 'i-lucide-book-open' },
  { key: 'news', label: t('analyst.form.infoType.news'), icon: 'i-lucide-newspaper' },
  { key: 'sentiment', label: t('analyst.form.infoType.sentiment'), icon: 'i-lucide-heart' },
  { key: 'onchain', label: t('analyst.form.infoType.onchain'), icon: 'i-lucide-link-2' },
  { key: 'events', label: t('analyst.form.infoType.events'), icon: 'i-lucide-calendar-clock' }
])

const enabledInfoCount = computed(() => Object.values(infoTypes).filter(Boolean).length)

// ─── Build input từ form state ───────────────────────────────
function buildInput(): AnalystInput {
  const enabledInfoTypes = (Object.keys(infoTypes) as InfoType[]).filter(k => infoTypes[k])
  return {
    symbol: symbol.value,
    amount: amount.value,
    risk: risk.value,
    horizon: horizon.value,
    maxRiskPct: maxRiskPct.value,
    experience: experience.value,
    goal: goal.value,
    style: style.value,
    infoTypes: enabledInfoTypes,
    reportDepth: reportDepth.value,
    tone: tone.value,
    stopLossKind: stopLossKind.value,
    profitTargetPct: profitTargetPct.value,
    compareSymbol: compareSymbol.value || undefined,
    interestTags: interestTags.value.length ? interestTags.value : undefined,
    excludeTags: excludeTags.value.length ? excludeTags.value : undefined,
    customRequest: customRequest.value.trim() || undefined,
    leverage: leverage.value,
    marketBias: marketBias.value,
    entryStrategy: entryStrategy.value
  }
}

// ─── Submit ──────────────────────────────────────────────────
async function submit() {
  await runAnalyze(buildInput())
  await nextTick()
  if (result.value) window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Lưu báo cáo hiện tại vào lịch sử (dùng lại đúng input đã phân tích)
async function onSaveReport() {
  await saveReport(buildInput())
  if (saved.value && result.value) {
    const r = result.value
    const dir = r.prediction.direction === 'UP' ? t('analyst.form.direction.up') : t('analyst.form.direction.down')
    const lev = r.plan.leverage > 1 ? ` · ${t('analyst.form.toast.leverageSuffix', { x: r.plan.leverage })}` : ''
    toast.add({
      title: t('analyst.form.toast.savedTitle', { symbol: r.coin.symbol }),
      description: `${t('analyst.form.toast.likelihood', { dir, confidence: r.prediction.confidence })} · ${t('analyst.form.toast.entry', { price: fmtPrice(r.coin.price) })} · SL $${fmtPrice(r.plan.stopLoss)} · TP $${fmtPrice(r.plan.takeProfit)}${lev}`,
      icon: 'i-lucide-bookmark-check',
      color: 'success',
      duration: 5000
    })
  } else if (saveError.value) {
    toast.add({
      title: t('analyst.form.toast.saveFailed'),
      description: saveError.value,
      icon: 'i-lucide-circle-x',
      color: 'error',
      duration: 5000
    })
  }
}

function closeReport() {
  reset()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Nút thoát basic góc trái: đang xem báo cáo → đóng báo cáo; còn lại → về /home
function exitOrBack() {
  if (result.value) closeReport()
  else navigateTo('/home')
}

// ─── Display helpers ─────────────────────────────────────────
function signalBadge(s: 'bullish' | 'neutral' | 'bearish') {
  if (s === 'bullish') return { color: 'success' as const, label: t('analyst.form.signal.positive') }
  if (s === 'bearish') return { color: 'error' as const, label: t('analyst.form.signal.negative') }
  return { color: 'neutral' as const, label: t('analyst.form.signal.neutral') }
}
function newsSentimentMeta(s: 'positive' | 'neutral' | 'negative') {
  if (s === 'positive') return { color: 'success' as const, label: t('analyst.form.signal.positive'), bar: 'bg-emerald-500' }
  if (s === 'negative') return { color: 'error' as const, label: t('analyst.form.signal.negative'), bar: 'bg-red-500' }
  return { color: 'neutral' as const, label: t('analyst.form.signal.neutral'), bar: 'bg-slate-400 dark:bg-gray-600' }
}
function fmtPrice(n: number): string {
  if (n < 1) return n.toFixed(4)
  if (n < 100) return n.toFixed(2)
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

// ─── Loading orbit icons ────────────────────────────────────
const ORBIT_ICONS = [
  { icon: 'i-lucide-coins', angle: 0, color: 'text-amber-400' },
  { icon: 'i-lucide-line-chart', angle: 60, color: 'text-blue-400' },
  { icon: 'i-lucide-newspaper', angle: 120, color: 'text-emerald-400' },
  { icon: 'i-lucide-wallet', angle: 180, color: 'text-violet-400' },
  { icon: 'i-lucide-bar-chart-3', angle: 240, color: 'text-rose-400' },
  { icon: 'i-lucide-brain', angle: 300, color: 'text-cyan-400' }
]
</script>

<template>
  <div class="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 text-slate-900 dark:text-gray-100">
    <!-- ═══ Header sticky ═══ -->
    <div class="sticky top-0 z-20 border-b border-slate-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md">
      <div class="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="result ? t('analyst.form.aria.exitReport') : t('analyst.form.aria.exit')"
            @click="exitOrBack"
          />
          <div class="w-10 h-10 rounded-xl bg-linear-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg shadow-primary/30">
            <UIcon
              name="i-lucide-sparkles"
              class="w-5 h-5 text-white"
            />
          </div>
          <div>
            <h1 class="text-base font-extrabold">
              AI Analyst
            </h1>
            <p class="text-xs text-slate-500 dark:text-gray-400">
              {{ t('analyst.form.headerSubtitle') }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            to="/analyst/history"
            icon="i-lucide-history"
            color="neutral"
            variant="ghost"
            size="sm"
          />
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
            @click="toggleColorMode"
          />
          <UButton
            to="/home"
            icon="i-lucide-home"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-6 py-8">
      <!-- ════════════════════════════════════════════════════════
           PHASE 1 — FORM
      ════════════════════════════════════════════════════════ -->
      <Transition
        enter-active-class="transition duration-300"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-200"
        leave-to-class="opacity-0"
      >
        <div
          v-if="!result && !loading"
          class="space-y-6"
        >
          <!-- Tagline (đã tone down) -->
          <div class="text-center mb-8">
            <h2 class="text-3xl font-black mb-2">
              {{ t('analyst.form.title') }}
            </h2>
            <p class="text-sm text-slate-500 dark:text-gray-400">
              {{ t('analyst.form.subtitle') }}
            </p>
          </div>

          <UCard :ui="{ root: 'shadow-sm', body: 'p-6 lg:p-8 space-y-6' }">
            <!-- 1. Coin picker (UPopover) + Amount — đều width -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-coins"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.coin.label') }}</label>
                  <span
                    v-if="catalog.loading.value"
                    class="text-xs text-slate-400"
                  >{{ t('analyst.form.coin.loading') }}</span>
                  <span
                    v-else
                    class="text-xs text-slate-400"
                  >{{ t('analyst.form.coin.count', { count: catalog.items.value.length }) }}</span>
                </div>

                <UPopover
                  v-model:open="coinPopoverOpen"
                  :content="{ align: 'start' }"
                >
                  <button
                    type="button"
                    class="w-full flex items-center justify-between gap-3 px-4 py-3 border-2 border-slate-200 dark:border-gray-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 transition cursor-pointer bg-white dark:bg-gray-900"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <img
                        v-if="currentCoin?.icon"
                        :src="currentCoin.icon"
                        :alt="symbol"
                        class="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 shrink-0"
                      >
                      <div
                        v-else
                        class="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-xs font-black shrink-0"
                      >
                        {{ symbol[0] }}
                      </div>
                      <div class="text-left min-w-0">
                        <div class="font-bold text-sm truncate">
                          {{ symbol }}{{ currentCoin?.name ? ` — ${currentCoin.name}` : '' }}
                        </div>
                        <div
                          v-if="currentCoin"
                          class="text-xs text-slate-500 dark:text-gray-400 tabular-nums"
                        >
                          ${{ fmtPrice(currentCoin.price) }}
                          <span
                            :class="currentCoin.changePercent24h >= 0 ? 'text-emerald-500' : 'text-red-500'"
                            class="ml-1 font-semibold tabular-nums"
                          >
                            {{ currentCoin.changePercent24h >= 0 ? '+' : '' }}{{ currentCoin.changePercent24h.toFixed(2) }}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <UIcon
                      name="i-lucide-chevron-down"
                      :class="['w-4 h-4 text-slate-400 transition shrink-0', coinPopoverOpen ? 'rotate-180' : '']"
                    />
                  </button>

                  <template #content>
                    <div class="w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl">
                      <div class="p-2 border-b border-slate-100 dark:border-gray-800">
                        <UInput
                          v-model="coinSearch"
                          icon="i-lucide-search"
                          :placeholder="t('analyst.form.coin.searchPlaceholder')"
                          size="sm"
                          class="w-full"
                          autofocus
                        />
                      </div>
                      <div class="grid grid-cols-[1.2fr_1fr_0.8fr] gap-2 px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider border-b border-slate-100 dark:border-gray-800">
                        <span>{{ t('analyst.form.coin.colCoin') }}</span><span class="text-right">{{ t('analyst.form.coin.colPrice') }}</span><span class="text-right">{{ t('analyst.form.coin.col24h') }}</span>
                      </div>
                      <div class="max-h-80 overflow-y-auto py-1">
                        <button
                          v-for="c in filteredCoins"
                          :key="c.symbol"
                          type="button"
                          class="w-full grid grid-cols-[1.2fr_1fr_0.8fr] gap-2 px-3 py-2 items-center hover:bg-slate-50 dark:hover:bg-gray-800/50 transition text-left"
                          @click="selectCoin(c.symbol)"
                        >
                          <div class="flex items-center gap-2 min-w-0">
                            <img
                              v-if="c.icon"
                              :src="c.icon"
                              :alt="c.symbol"
                              class="w-5 h-5 rounded-full shrink-0"
                            >
                            <div
                              v-else
                              class="w-5 h-5 rounded-full bg-slate-200 dark:bg-gray-700 flex items-center justify-center text-[9px] font-black shrink-0"
                            >
                              {{ c.symbol[0] }}
                            </div>
                            <span class="text-xs font-bold truncate">{{ c.symbol }}</span>
                            <span class="text-[10px] text-slate-400 truncate">{{ c.name }}</span>
                          </div>
                          <div class="text-right text-xs font-semibold tabular-nums">
                            ${{ fmtPrice(c.price) }}
                          </div>
                          <div :class="['text-right text-xs font-semibold tabular-nums', c.changePercent24h >= 0 ? 'text-emerald-500' : 'text-red-500']">
                            {{ c.changePercent24h >= 0 ? '+' : '' }}{{ c.changePercent24h.toFixed(2) }}%
                          </div>
                        </button>
                        <div
                          v-if="!filteredCoins.length"
                          class="py-8 text-center text-xs text-slate-400"
                        >
                          {{ t('analyst.form.coin.notFound') }}
                        </div>
                      </div>
                    </div>
                  </template>
                </UPopover>
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-dollar-sign"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.amount.label') }}</label>
                </div>
                <div class="flex items-center gap-3 px-4 py-2.5 border-2 border-slate-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus-within:border-primary-400 dark:focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-100 dark:focus-within:ring-primary-900/40 transition">
                  <div class="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-950/40 flex items-center justify-center shrink-0">
                    <UIcon
                      name="i-lucide-dollar-sign"
                      class="w-5 h-5 text-primary-500"
                    />
                  </div>
                  <input
                    v-model.number="amount"
                    type="number"
                    min="0"
                    placeholder="1000"
                    class="flex-1 min-w-0 bg-transparent outline-none text-2xl font-semibold tabular-nums placeholder:text-slate-300 dark:placeholder:text-gray-600"
                  >
                  <span class="text-[11px] font-semibold text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg shrink-0">USDT</span>
                </div>
                <div class="flex gap-1.5 mt-2">
                  <button
                    v-for="n in [100, 500, 1000, 5000, 10000]"
                    :key="n"
                    type="button"
                    :class="['flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition',
                             amount === n
                               ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 shadow-sm'
                               : 'border-slate-200 dark:border-gray-700 text-slate-500 hover:border-slate-300 dark:hover:border-gray-600']"
                    @click="amount = n"
                  >
                    ${{ n >= 1000 ? (n / 1000) + 'K' : n }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 2. Risk + Horizon — đều 4 col -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-target"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.risk') }}</label>
                </div>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="r in RISK_ITEMS"
                    :key="r.value"
                    type="button"
                    :class="['p-2.5 rounded-xl border-2 transition-all text-left',
                             risk === r.value
                               ? `${r.border} ${r.bg} shadow-md`
                               : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600']"
                    @click="risk = r.value as RiskLevel"
                  >
                    <UIcon
                      :name="r.icon"
                      :class="['w-4 h-4 mb-1', risk === r.value ? r.color : 'text-slate-400']"
                    />
                    <div :class="['text-xs font-bold', risk === r.value ? r.color : '']">
                      {{ r.label }}
                    </div>
                    <div class="text-[10px] text-slate-500 dark:text-gray-400">
                      {{ r.note }}
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-clock"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.horizon') }}</label>
                </div>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="h in HORIZON_ITEMS"
                    :key="h.value"
                    type="button"
                    :class="['p-2.5 rounded-xl border-2 transition-all text-left',
                             horizon === h.value
                               ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 shadow-md'
                               : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600']"
                    @click="horizon = h.value as Horizon"
                  >
                    <UIcon
                      :name="h.icon"
                      class="w-4 h-4 text-primary-500 mb-1"
                    />
                    <div class="text-xs font-bold">
                      {{ h.label }}
                    </div>
                    <div class="text-[10px] text-slate-500 dark:text-gray-400">
                      {{ h.note }}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Divider -->
            <div class="relative py-2">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-slate-200 dark:border-gray-800" />
              </div>
              <div class="relative flex justify-center">
                <span class="px-3 bg-white dark:bg-gray-900 text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <UIcon
                    name="i-lucide-settings-2"
                    class="w-3.5 h-3.5"
                  />
                  {{ t('analyst.form.section.advanced') }}
                </span>
              </div>
            </div>

            <!-- 3. Experience — 3 segment buttons compact -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <UIcon
                  name="i-lucide-graduation-cap"
                  class="w-4 h-4 text-primary-500"
                />
                <label class="text-sm font-bold">{{ t('analyst.form.section.experience') }}</label>
                <span class="text-xs text-slate-400">{{ t('analyst.form.section.experienceHint') }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="e in EXPERIENCE_ITEMS"
                  :key="e.value"
                  type="button"
                  :class="['p-2.5 rounded-xl border-2 transition-all text-left',
                           experience === e.value
                             ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 shadow-md'
                             : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600']"
                  @click="experience = e.value as Experience"
                >
                  <UIcon
                    :name="e.icon"
                    class="w-4 h-4 text-primary-500 mb-1"
                  />
                  <div class="text-xs font-bold">
                    {{ e.label }}
                  </div>
                  <div class="text-[10px] text-slate-500 dark:text-gray-400">
                    {{ e.desc }}
                  </div>
                </button>
              </div>
            </div>

            <!-- 4. Goal (USelect) + Style (UPopover) — đều width -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-flag"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.goal') }}</label>
                </div>
                <UPopover
                  v-model:open="goalPopoverOpen"
                  :content="{ align: 'start' }"
                >
                  <button
                    type="button"
                    class="w-full flex items-center justify-between gap-3 px-4 py-3 border border-slate-200 dark:border-gray-700 rounded-lg hover:border-primary-300 transition bg-white dark:bg-gray-900"
                  >
                    <div class="flex items-center gap-3">
                      <UIcon
                        :name="currentGoal.icon"
                        class="w-5 h-5 text-primary-500"
                      />
                      <div class="text-left">
                        <div class="text-sm font-bold">
                          {{ currentGoal.label }}
                        </div>
                        <div class="text-[11px] text-slate-500">
                          {{ currentGoal.desc }}
                        </div>
                      </div>
                    </div>
                    <UIcon
                      name="i-lucide-chevron-down"
                      :class="['w-4 h-4 text-slate-400 transition', goalPopoverOpen ? 'rotate-180' : '']"
                    />
                  </button>
                  <template #content>
                    <div class="w-80 bg-white dark:bg-gray-900 rounded-lg shadow-xl py-2">
                      <button
                        v-for="g in GOAL_ITEMS"
                        :key="g.value"
                        type="button"
                        :class="['w-full flex items-start gap-3 px-3 py-3 hover:bg-slate-50 dark:hover:bg-gray-800/50 transition text-left',
                                 goal === g.value ? 'bg-primary-50 dark:bg-primary-950/30' : '']"
                        @click="goal = g.value as Goal; goalPopoverOpen = false"
                      >
                        <UIcon
                          :name="g.icon"
                          :class="['w-5 h-5 mt-0.5', goal === g.value ? 'text-primary-600' : 'text-slate-400']"
                        />
                        <div class="flex-1">
                          <div :class="['text-sm font-bold', goal === g.value ? 'text-primary-700 dark:text-primary-300' : '']">
                            {{ g.label }}
                          </div>
                          <div class="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                            {{ g.desc }}
                          </div>
                        </div>
                        <UIcon
                          v-if="goal === g.value"
                          name="i-lucide-check"
                          class="w-4 h-4 text-primary-500 mt-1"
                        />
                      </button>
                    </div>
                  </template>
                </UPopover>
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-palette"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.style') }}</label>
                </div>
                <UPopover
                  v-model:open="stylePopoverOpen"
                  :content="{ align: 'start' }"
                >
                  <button
                    type="button"
                    class="w-full flex items-center justify-between gap-3 px-4 py-3 border border-slate-200 dark:border-gray-700 rounded-lg hover:border-primary-300 transition bg-white dark:bg-gray-900"
                  >
                    <div class="flex items-center gap-3">
                      <UIcon
                        :name="currentStyle.icon"
                        class="w-5 h-5 text-primary-500"
                      />
                      <div class="text-left">
                        <div class="text-sm font-bold">
                          {{ currentStyle.label }}
                        </div>
                        <div class="text-[11px] text-slate-500">
                          {{ currentStyle.desc }}
                        </div>
                      </div>
                    </div>
                    <UIcon
                      name="i-lucide-chevron-down"
                      :class="['w-4 h-4 text-slate-400 transition', stylePopoverOpen ? 'rotate-180' : '']"
                    />
                  </button>
                  <template #content>
                    <div class="w-80 bg-white dark:bg-gray-900 rounded-lg shadow-xl py-2">
                      <button
                        v-for="s in STYLE_ITEMS"
                        :key="s.value"
                        type="button"
                        :class="['w-full flex items-start gap-3 px-3 py-3 hover:bg-slate-50 dark:hover:bg-gray-800/50 transition text-left',
                                 style === s.value ? 'bg-primary-50 dark:bg-primary-950/30' : '']"
                        @click="style = s.value as Style; stylePopoverOpen = false"
                      >
                        <UIcon
                          :name="s.icon"
                          :class="['w-5 h-5 mt-0.5', style === s.value ? 'text-primary-600' : 'text-slate-400']"
                        />
                        <div class="flex-1">
                          <div :class="['text-sm font-bold', style === s.value ? 'text-primary-700 dark:text-primary-300' : '']">
                            {{ s.label }}
                          </div>
                          <div class="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                            {{ s.desc }}
                          </div>
                        </div>
                        <UIcon
                          v-if="style === s.value"
                          name="i-lucide-check"
                          class="w-4 h-4 text-primary-500 mt-1"
                        />
                      </button>
                    </div>
                  </template>
                </UPopover>
              </div>
            </div>

            <!-- 5a. Tone + Stop Loss kind -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-mic"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.tone') }}</label>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="toneItem in TONE_ITEMS"
                    :key="toneItem.value"
                    type="button"
                    :class="['p-2.5 rounded-xl border-2 transition-all text-left',
                             tone === toneItem.value
                               ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 shadow-md'
                               : 'border-slate-200 dark:border-gray-700 hover:border-slate-300']"
                    @click="tone = toneItem.value as Tone"
                  >
                    <UIcon
                      :name="toneItem.icon"
                      class="w-4 h-4 text-primary-500 mb-1"
                    />
                    <div class="text-xs font-bold">
                      {{ toneItem.label }}
                    </div>
                    <div class="text-[10px] text-slate-500 dark:text-gray-400">
                      {{ toneItem.desc }}
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-shield-x"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.stopLoss') }}</label>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="s in STOP_LOSS_ITEMS"
                    :key="s.value"
                    type="button"
                    :class="['p-2.5 rounded-xl border-2 transition-all text-left',
                             stopLossKind === s.value
                               ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 shadow-md'
                               : 'border-slate-200 dark:border-gray-700 hover:border-slate-300']"
                    @click="stopLossKind = s.value as StopLossKind"
                  >
                    <UIcon
                      :name="s.icon"
                      class="w-4 h-4 text-primary-500 mb-1"
                    />
                    <div class="text-xs font-bold">
                      {{ s.label }}
                    </div>
                    <div class="text-[10px] text-slate-500">
                      {{ s.desc }}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- 5a-2. Leverage (đòn bẩy) -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <UIcon
                  name="i-lucide-gauge"
                  class="w-4 h-4 text-primary-500"
                />
                <label class="text-sm font-bold">{{ t('analyst.form.section.leverage') }}</label>
                <span class="text-xs text-slate-400">{{ t('analyst.form.section.leverageHint') }}</span>
              </div>
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <button
                  v-for="l in LEVERAGE_ITEMS"
                  :key="l.value"
                  type="button"
                  :class="['p-2.5 rounded-xl border-2 transition-all text-center',
                           leverage === l.value
                             ? (l.value === 'spot'
                               ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md'
                               : 'border-red-500 bg-red-50 dark:bg-red-950/30 shadow-md')
                             : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600']"
                  @click="leverage = l.value as Leverage"
                >
                  <div :class="['text-sm font-black', leverage === l.value ? (l.value === 'spot' ? 'text-emerald-600' : 'text-red-600') : '']">
                    {{ l.label }}
                  </div>
                  <div class="text-[10px] text-slate-500 dark:text-gray-400">
                    {{ l.note }}
                  </div>
                </button>
              </div>
            </div>

            <!-- 5a-3. Market bias + Entry strategy -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-compass"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.marketBias') }}</label>
                  <span class="text-xs text-slate-400">{{ t('analyst.form.section.marketBiasHint') }}</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="b in MARKET_BIAS_ITEMS"
                    :key="b.value"
                    type="button"
                    :class="['flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left',
                             marketBias === b.value
                               ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 shadow-md'
                               : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600']"
                    @click="marketBias = b.value as MarketBias"
                  >
                    <UIcon
                      :name="b.icon"
                      :class="['w-4 h-4 shrink-0', marketBias === b.value ? 'text-primary-500' : 'text-slate-400']"
                    />
                    <div class="min-w-0">
                      <div class="text-xs font-bold">
                        {{ b.label }}
                      </div>
                      <div class="text-[10px] text-slate-500 dark:text-gray-400 truncate">
                        {{ b.desc }}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-log-in"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.entry') }}</label>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="en in ENTRY_STRATEGY_ITEMS"
                    :key="en.value"
                    type="button"
                    :class="['flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left',
                             entryStrategy === en.value
                               ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 shadow-md'
                               : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600']"
                    @click="entryStrategy = en.value as EntryStrategy"
                  >
                    <UIcon
                      :name="en.icon"
                      :class="['w-4 h-4 shrink-0', entryStrategy === en.value ? 'text-primary-500' : 'text-slate-400']"
                    />
                    <div class="min-w-0">
                      <div class="text-xs font-bold">
                        {{ en.label }}
                      </div>
                      <div class="text-[10px] text-slate-500 dark:text-gray-400 truncate">
                        {{ en.desc }}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- 5b. Compare with coin (optional) -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <UIcon
                  name="i-lucide-arrow-left-right"
                  class="w-4 h-4 text-primary-500"
                />
                <label class="text-sm font-bold">{{ t('analyst.form.section.compare') }}</label>
                <span class="text-xs text-slate-400">{{ t('analyst.form.section.compareHint') }}</span>
              </div>
              <UPopover
                v-model:open="comparePopoverOpen"
                :content="{ align: 'start' }"
              >
                <button
                  type="button"
                  class="w-full flex items-center justify-between gap-3 px-4 py-3 border border-slate-200 dark:border-gray-700 rounded-lg hover:border-primary-300 transition bg-white dark:bg-gray-900"
                >
                  <div
                    v-if="currentCompareCoin"
                    class="flex items-center gap-3"
                  >
                    <img
                      v-if="currentCompareCoin.icon"
                      :src="currentCompareCoin.icon"
                      :alt="currentCompareCoin.symbol"
                      class="w-6 h-6 rounded-full"
                    >
                    <span class="text-sm font-bold">{{ currentCompareCoin.symbol }} — {{ currentCompareCoin.name }}</span>
                  </div>
                  <div
                    v-else
                    class="flex items-center gap-2 text-slate-400"
                  >
                    <UIcon
                      name="i-lucide-plus-circle"
                      class="w-4 h-4"
                    />
                    <span class="text-sm">{{ t('analyst.form.compare.placeholder') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <UButton
                      v-if="compareSymbol"
                      icon="i-lucide-x"
                      size="xs"
                      color="error"
                      variant="ghost"
                      @click.stop="selectCompareCoin(null)"
                    />
                    <UIcon
                      name="i-lucide-chevron-down"
                      :class="['w-4 h-4 text-slate-400 transition', comparePopoverOpen ? 'rotate-180' : '']"
                    />
                  </div>
                </button>
                <template #content>
                  <div class="w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl">
                    <div class="p-2 border-b border-slate-100 dark:border-gray-800">
                      <UInput
                        v-model="compareSearch"
                        icon="i-lucide-search"
                        :placeholder="t('analyst.form.compare.searchPlaceholder')"
                        size="sm"
                        class="w-full"
                        autofocus
                      />
                    </div>
                    <div class="max-h-80 overflow-y-auto py-1">
                      <button
                        v-for="c in filteredCompareCoins"
                        :key="c.symbol"
                        type="button"
                        class="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-gray-800/50 transition text-left"
                        @click="selectCompareCoin(c.symbol)"
                      >
                        <img
                          v-if="c.icon"
                          :src="c.icon"
                          :alt="c.symbol"
                          class="w-5 h-5 rounded-full"
                        >
                        <div
                          v-else
                          class="w-5 h-5 rounded-full bg-slate-200 dark:bg-gray-700"
                        />
                        <span class="text-xs font-bold">{{ c.symbol }}</span>
                        <span class="text-[10px] text-slate-400 truncate">{{ c.name }}</span>
                      </button>
                    </div>
                  </div>
                </template>
              </UPopover>
            </div>

            <!-- 5c. Max risk pct + Profit target -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-shield-alert"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.maxRisk') }}</label>
                </div>
                <div class="flex items-center gap-3">
                  <USlider
                    v-model="maxRiskPct"
                    :min="1"
                    :max="20"
                    :step="1"
                    color="error"
                    class="flex-1"
                  />
                  <div class="w-16 text-center px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800">
                    <span class="text-base font-black text-red-700 dark:text-red-400">{{ maxRiskPct }}%</span>
                  </div>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-trophy"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.profitTarget') }}</label>
                </div>
                <div class="flex items-center gap-3">
                  <USlider
                    v-model="profitTargetPct"
                    :min="1"
                    :max="50"
                    :step="1"
                    color="success"
                    class="flex-1"
                  />
                  <div class="w-16 text-center px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800">
                    <span class="text-base font-black text-emerald-700 dark:text-emerald-400">+{{ profitTargetPct }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 6. Info types -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <UIcon
                  name="i-lucide-list-checks"
                  class="w-4 h-4 text-primary-500"
                />
                <label class="text-sm font-bold">{{ t('analyst.form.section.infoTypes') }}</label>
                <span class="text-xs text-slate-400">{{ t('analyst.form.section.infoTypesCount', { count: enabledInfoCount }) }}</span>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                <button
                  v-for="infoItem in INFO_TYPE_ITEMS"
                  :key="infoItem.key"
                  type="button"
                  :class="['flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left',
                           infoTypes[infoItem.key]
                             ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                             : 'border-slate-200 dark:border-gray-700 hover:border-slate-300']"
                  @click="infoTypes[infoItem.key] = !infoTypes[infoItem.key]"
                >
                  <div
                    :class="['w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                             infoTypes[infoItem.key] ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-gray-600']"
                  >
                    <UIcon
                      v-if="infoTypes[infoItem.key]"
                      name="i-lucide-check"
                      class="w-3 h-3 text-white"
                    />
                  </div>
                  <UIcon
                    :name="infoItem.icon"
                    class="w-4 h-4 text-slate-500"
                  />
                  <span class="text-xs font-semibold">{{ infoItem.label }}</span>
                </button>
              </div>
            </div>

            <!-- 7. Depth -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <UIcon
                  name="i-lucide-ruler"
                  class="w-4 h-4 text-primary-500"
                />
                <label class="text-sm font-bold">{{ t('analyst.form.section.depth') }}</label>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="d in DEPTH_ITEMS"
                  :key="d.value"
                  type="button"
                  :class="['p-2.5 rounded-xl border-2 transition-all text-left',
                           reportDepth === d.value
                             ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 shadow-md'
                             : 'border-slate-200 dark:border-gray-700 hover:border-slate-300']"
                  @click="reportDepth = d.value as Depth"
                >
                  <div class="text-sm font-bold">
                    {{ d.label }}
                  </div>
                  <div class="text-[11px] text-slate-500 dark:text-gray-400">
                    {{ d.desc }}
                  </div>
                </button>
              </div>
            </div>

            <!-- 7b. Interest + Exclude tags (bonus) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-tag"
                    class="w-4 h-4 text-emerald-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.interestTags') }}</label>
                  <span class="text-xs text-slate-400">{{ t('analyst.form.section.interestTagsHint') }}</span>
                </div>
                <div class="min-h-12 flex flex-wrap gap-1.5 p-2.5 border-2 border-slate-200 dark:border-gray-700 rounded-xl focus-within:border-emerald-500 transition">
                  <UBadge
                    v-for="(tag, i) in interestTags"
                    :key="i"
                    color="success"
                    variant="soft"
                    size="sm"
                    class="gap-1"
                  >
                    {{ tag }}
                    <button
                      type="button"
                      class="ml-1 hover:text-error"
                      @click="removeTag('interest', i)"
                    >
                      <UIcon
                        name="i-lucide-x"
                        class="w-3 h-3"
                      />
                    </button>
                  </UBadge>
                  <input
                    v-model="newInterest"
                    type="text"
                    :placeholder="t('analyst.form.tags.interestPlaceholder')"
                    class="flex-1 min-w-32 outline-none bg-transparent text-xs"
                    @keydown.enter.prevent="addTag('interest')"
                  >
                </div>
                <p class="text-[11px] text-slate-400 mt-1">
                  {{ t('analyst.form.tags.hint') }}
                </p>
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <UIcon
                    name="i-lucide-ban"
                    class="w-4 h-4 text-red-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.excludeTags') }}</label>
                  <span class="text-xs text-slate-400">{{ t('analyst.form.section.excludeTagsHint') }}</span>
                </div>
                <div class="min-h-12 flex flex-wrap gap-1.5 p-2.5 border-2 border-slate-200 dark:border-gray-700 rounded-xl focus-within:border-red-500 transition">
                  <UBadge
                    v-for="(tag, i) in excludeTags"
                    :key="i"
                    color="error"
                    variant="soft"
                    size="sm"
                    class="gap-1"
                  >
                    {{ tag }}
                    <button
                      type="button"
                      class="ml-1 hover:text-error"
                      @click="removeTag('exclude', i)"
                    >
                      <UIcon
                        name="i-lucide-x"
                        class="w-3 h-3"
                      />
                    </button>
                  </UBadge>
                  <input
                    v-model="newExclude"
                    type="text"
                    :placeholder="t('analyst.form.tags.excludePlaceholder')"
                    class="flex-1 min-w-32 outline-none bg-transparent text-xs"
                    @keydown.enter.prevent="addTag('exclude')"
                  >
                </div>
                <p class="text-[11px] text-slate-400 mt-1">
                  {{ t('analyst.form.tags.hint') }}
                </p>
              </div>
            </div>

            <!-- 8. Custom request (NEW) -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-message-square-text"
                    class="w-4 h-4 text-primary-500"
                  />
                  <label class="text-sm font-bold">{{ t('analyst.form.section.customRequest') }} <span class="text-xs font-normal text-slate-400">{{ t('analyst.form.section.optional') }}</span></label>
                </div>
                <span :class="['text-xs', customRequest.length > 500 ? 'text-error font-bold' : 'text-slate-400']">
                  {{ customRequest.length }}/500
                </span>
              </div>
              <UTextarea
                v-model="customRequest"
                :rows="3"
                :placeholder="t('analyst.form.customRequest.placeholder')"
                :maxlength="500"
                class="w-full"
              />
              <p class="text-[11px] text-slate-500 dark:text-gray-400 mt-1.5 italic">
                {{ t('analyst.form.customRequest.note') }}
              </p>
            </div>

            <!-- Summary -->
            <div class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 border border-slate-200 dark:border-gray-700">
              <div class="flex items-center gap-2 mb-2">
                <UIcon
                  name="i-lucide-clipboard-list"
                  class="w-4 h-4 text-slate-500"
                />
                <span class="text-xs font-bold uppercase tracking-wide text-slate-500">{{ t('analyst.form.summary.title') }}</span>
              </div>
              <div class="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
                <strong class="text-slate-900 dark:text-white">{{ symbol }}</strong>
                <span v-if="compareSymbol"> vs <strong class="text-slate-900 dark:text-white">{{ compareSymbol }}</strong></span>
                · ${{ amount }} ·
                <strong class="text-slate-900 dark:text-white">{{ RISK_ITEMS.find(r => r.value === risk)?.label }}</strong> ·
                <strong class="text-slate-900 dark:text-white">{{ HORIZON_ITEMS.find(h => h.value === horizon)?.label }}</strong> ·
                <strong class="text-slate-900 dark:text-white">{{ EXPERIENCE_ITEMS.find(e => e.value === experience)?.label }}</strong> ·
                <strong class="text-slate-900 dark:text-white">{{ currentGoal.label }}</strong> ·
                <strong class="text-slate-900 dark:text-white">{{ currentStyle.label }}</strong> ·
                {{ t('analyst.form.summary.tone') }} <strong class="text-slate-900 dark:text-white">{{ TONE_ITEMS.find(t => t.value === tone)?.label.toLowerCase() }}</strong> ·
                SL <strong class="text-slate-900 dark:text-white">{{ STOP_LOSS_ITEMS.find(s => s.value === stopLossKind)?.label.toLowerCase() }}</strong> ·
                <strong :class="leverage === 'spot' ? 'text-emerald-600' : 'text-red-600'">{{ LEVERAGE_ITEMS.find(l => l.value === leverage)?.label }}</strong> ·
                <strong class="text-slate-900 dark:text-white">{{ MARKET_BIAS_ITEMS.find(b => b.value === marketBias)?.label.toLowerCase() }}</strong> ·
                {{ t('analyst.form.summary.entry') }} <strong class="text-slate-900 dark:text-white">{{ ENTRY_STRATEGY_ITEMS.find(e => e.value === entryStrategy)?.label.toLowerCase() }}</strong> ·
                risk {{ maxRiskPct }}% · target +{{ profitTargetPct }}% ·
                {{ t('analyst.form.summary.infoCount', { count: enabledInfoCount }) }} ·
                <strong class="text-slate-900 dark:text-white">{{ DEPTH_ITEMS.find(d => d.value === reportDepth)?.label.toLowerCase() }}</strong>
                <span v-if="interestTags.length"> · <strong class="text-emerald-600">{{ t('analyst.form.summary.interestTags', { count: interestTags.length }) }}</strong></span>
                <span v-if="excludeTags.length"> · <strong class="text-red-600">{{ t('analyst.form.summary.excludeTags', { count: excludeTags.length }) }}</strong></span>
                <span v-if="customRequest.trim()"> · <strong class="text-primary-600">{{ t('analyst.form.summary.hasCustomRequest') }}</strong></span>
              </div>
            </div>

            <UAlert
              v-if="error"
              color="error"
              variant="subtle"
              :title="error"
              icon="i-lucide-circle-x"
            />

            <UButton
              block
              size="xl"
              color="primary"
              icon="i-lucide-sparkles"
              @click="submit"
            >
              {{ t('analyst.form.btn.analyze') }}
            </UButton>
          </UCard>
        </div>
      </Transition>

      <!-- ════════════════════════════════════════════════════════
           PHASE 2 — LOADING (orbit icons + progress bar)
      ════════════════════════════════════════════════════════ -->
      <Transition
        enter-active-class="transition duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200"
        leave-to-class="opacity-0"
      >
        <UCard
          v-if="loading"
          :ui="{ body: 'p-10 lg:p-16' }"
        >
          <div class="max-w-lg mx-auto space-y-8">
            <!-- Orbit: 6 icons quay quanh icon center -->
            <div class="relative w-48 h-48 mx-auto">
              <!-- Center sparkles -->
              <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-20 h-20 rounded-full bg-linear-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-primary/40 animate-pulse">
                <UIcon
                  name="i-lucide-sparkles"
                  class="w-10 h-10 text-white"
                />
              </div>
              <!-- Pulse rings -->
              <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-primary-400 dark:border-primary-700 animate-ping opacity-30" />
              <!-- Orbit icons -->
              <div class="absolute inset-0 analyst-orbit">
                <div
                  v-for="(o, i) in ORBIT_ICONS"
                  :key="i"
                  class="absolute top-1/2 left-1/2 w-10 h-10 -mt-5 -ml-5 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center"
                  :style="{ transform: `rotate(${o.angle}deg) translateX(85px) rotate(-${o.angle}deg)` }"
                >
                  <UIcon
                    :name="o.icon"
                    :class="['w-5 h-5', o.color]"
                  />
                </div>
              </div>
            </div>

            <!-- Progress bar gradient -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">{{ t('analyst.form.loading.progress') }}</span>
                <span class="text-xs font-black text-primary-600 dark:text-primary-400 tabular-nums">{{ Math.round(progress) }}%</span>
              </div>
              <div class="h-2 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-linear-to-r from-primary-500 via-violet-500 to-pink-500 rounded-full transition-all duration-200"
                  :style="{ width: progress + '%' }"
                />
              </div>
            </div>

            <!-- Current step text + sub -->
            <div class="text-center">
              <div class="flex items-center justify-center gap-2 mb-1">
                <UIcon
                  :name="steps[currentStep]?.icon"
                  class="w-5 h-5 text-primary-500"
                />
                <h3 class="text-base font-black">
                  {{ steps[currentStep]?.title }}
                </h3>
              </div>
              <p class="text-xs text-slate-500 dark:text-gray-400">
                {{ steps[currentStep]?.sub }}
              </p>
            </div>

            <!-- Step list compact -->
            <div class="grid grid-cols-3 gap-2">
              <div
                v-for="(s, i) in steps"
                :key="i"
                :class="['p-2 rounded-lg border flex flex-col items-center gap-1 transition',
                         i < currentStep ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                         : i === currentStep ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 shadow-md'
                           : 'border-slate-200 dark:border-gray-700 opacity-50']"
              >
                <UIcon
                  v-if="i < currentStep"
                  name="i-lucide-check-circle-2"
                  class="w-4 h-4 text-emerald-500"
                />
                <UIcon
                  v-else-if="i === currentStep"
                  name="i-lucide-loader-circle"
                  class="w-4 h-4 text-primary-500 animate-spin"
                />
                <UIcon
                  v-else
                  :name="s.icon"
                  class="w-4 h-4 text-slate-400"
                />
                <span class="text-[10px] text-center leading-tight">{{ s.short }}</span>
              </div>
            </div>
          </div>
        </UCard>
      </Transition>

      <!-- ════════════════════════════════════════════════════════
           PHASE 3 — REPORT
      ════════════════════════════════════════════════════════ -->
      <Transition
        enter-active-class="transition duration-500"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div
          v-if="result"
          class="space-y-5"
        >
          <!-- Report header -->
          <div class="bg-linear-to-r from-slate-900 to-violet-900 rounded-2xl p-6 text-white relative overflow-hidden">
            <div class="absolute top-0 right-0 w-64 h-64 rounded-full bg-violet-500/20 -translate-y-32 translate-x-32 blur-3xl" />
            <div class="relative">
              <UBadge
                color="warning"
                variant="solid"
                size="sm"
                icon="i-lucide-sparkles"
                class="mb-3"
              >
                {{ t('analyst.form.report.badge') }}
              </UBadge>
              <h2 class="text-2xl font-black mb-1">
                {{ result.coin.name }} ({{ result.coin.symbol }})
              </h2>
              <p class="text-sm text-violet-200">
                <UIcon
                  name="i-lucide-calendar"
                  class="inline w-3.5 h-3.5 mr-1"
                />
                {{ new Date(result.meta.generatedAt).toLocaleString('vi-VN') }}
                <span class="ml-2">
                  <UIcon
                    name="i-lucide-clock"
                    class="inline w-3 h-3 mr-0.5"
                  />
                  {{ Math.round(result.meta.elapsedMs / 100) / 10 }}s
                </span>
                <span
                  v-if="result.meta.cached"
                  class="ml-2"
                >
                  <UIcon
                    name="i-lucide-zap"
                    class="inline w-3 h-3 mr-0.5"
                  /> {{ t('analyst.form.report.fromCache') }}
                </span>
              </p>
            </div>
          </div>

          <!-- BIG SIGNAL -->
          <div
            :class="['rounded-2xl border-4 p-6 relative overflow-hidden',
                     result.prediction.direction === 'UP'
                       ? 'bg-linear-to-br from-emerald-50 to-green-100 dark:from-emerald-950/40 dark:to-green-950/40 border-emerald-400 dark:border-emerald-600'
                       : 'bg-linear-to-br from-red-50 to-rose-100 dark:from-red-950/40 dark:to-rose-950/40 border-red-400 dark:border-red-600']"
          >
            <div class="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 items-center">
              <div>
                <div
                  class="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                  :class="result.prediction.direction === 'UP' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'"
                >
                  <UIcon
                    name="i-lucide-sparkles"
                    class="w-3.5 h-3.5"
                  /> {{ t('analyst.form.report.probabilityLabel') }}
                </div>
                <div class="flex items-center gap-3 mb-2">
                  <UIcon
                    :name="result.prediction.direction === 'UP' ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                    :class="['w-16 h-16', result.prediction.direction === 'UP' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400']"
                  />
                  <div>
                    <div
                      :class="['text-2xl md:text-3xl font-black leading-tight',
                               result.prediction.direction === 'UP' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300']"
                    >
                      {{ t('analyst.form.report.likelihood', { dir: result.prediction.direction === 'UP' ? t('analyst.form.direction.up') : t('analyst.form.direction.down') }) }}
                    </div>
                    <div class="text-xs text-slate-500 mt-0.5">
                      {{ t('analyst.form.report.within', { tf: result.prediction.timeframeLabel }) }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="space-y-3">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-bold">CONFIDENCE</span>
                    <span
                      :class="['text-lg font-black',
                               result.prediction.direction === 'UP' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400']"
                    >
                      {{ result.prediction.confidence }}%
                    </span>
                  </div>
                  <div class="h-2 bg-white/60 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      :class="['h-full rounded-full transition-all',
                               result.prediction.direction === 'UP' ? 'bg-emerald-500' : 'bg-red-500']"
                      :style="{ width: result.prediction.confidence + '%' }"
                    />
                  </div>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <span class="text-xs font-bold text-slate-500">{{ t('analyst.form.report.range') }}</span>
                  <span :class="['font-black tabular-nums', result.prediction.direction === 'UP' ? 'text-emerald-700' : 'text-red-700']">
                    {{ result.prediction.direction === 'UP' ? '+' : '-' }}{{ result.prediction.rangePctLow }}% {{ t('analyst.form.report.rangeTo') }} {{ result.prediction.direction === 'UP' ? '+' : '-' }}{{ result.prediction.rangePctHigh }}%
                  </span>
                </div>
                <div>
                  <div class="text-xs font-bold text-slate-500 mb-1">
                    {{ t('analyst.form.report.basis') }}
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="r in result.prediction.reasons"
                      :key="r"
                      :class="['text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1',
                               result.prediction.direction === 'UP' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300']"
                    >
                      <UIcon
                        name="i-lucide-check"
                        class="w-3 h-3"
                      />{{ r }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- GIÁ HIỆN TẠI -->
          <UCard>
            <div class="flex items-center gap-2 mb-3">
              <UIcon
                name="i-lucide-circle-dollar-sign"
                class="w-4 h-4 text-primary-500"
              />
              <h3 class="text-sm font-extrabold text-slate-500 dark:text-gray-400">
                {{ t('analyst.form.report.currentPrice') }}
              </h3>
            </div>
            <div class="flex items-baseline gap-4">
              <span class="text-4xl font-black tabular-nums">${{ fmtPrice(result.coin.price) }}</span>
              <UBadge
                :color="result.coin.change24h >= 0 ? 'success' : 'error'"
                variant="soft"
                size="lg"
              >
                <UIcon
                  :name="result.coin.change24h >= 0 ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                  class="w-3 h-3 mr-0.5"
                />
                {{ result.coin.change24h >= 0 ? '+' : '' }}{{ result.coin.change24h.toFixed(2) }}%
              </UBadge>
              <span class="text-sm text-slate-500">{{ t('analyst.form.report.marketCap', { cap: (result.coin.marketCap / 1e9).toFixed(1) }) }}</span>
            </div>
          </UCard>

          <!-- TA Indicators -->
          <UCard>
            <div class="flex items-center gap-2 mb-4">
              <UIcon
                name="i-lucide-bar-chart-3"
                class="w-4 h-4 text-primary-500"
              />
              <h3 class="text-sm font-extrabold text-slate-500 dark:text-gray-400">
                {{ t('analyst.form.report.taTitle') }}
              </h3>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 border border-slate-100 dark:border-gray-800">
                <div class="flex items-center justify-between mb-2">
                  <UiTermPopover
                    en="EMA"
                    vi="Đường trung bình động"
                    desc="Đường ngắn hạn (EMA20) cắt xuống dưới đường dài hạn (EMA50) báo hiệu xu hướng giá đang giảm, và ngược lại."
                  >
                    <span class="text-xs font-bold text-slate-500">EMA20 / EMA50</span>
                  </UiTermPopover>
                  <UBadge
                    :color="signalBadge(result.ta.signals.ema).color"
                    variant="soft"
                    size="xs"
                  >
                    {{ signalBadge(result.ta.signals.ema).label }}
                  </UBadge>
                </div>
                <div class="text-base font-black tabular-nums">
                  ${{ fmtPrice(result.ta.ema20) }}
                </div>
                <p class="text-[11px] text-slate-500 mt-1">
                  EMA50: ${{ fmtPrice(result.ta.ema50) }}
                </p>
              </div>
              <div class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 border border-slate-100 dark:border-gray-800">
                <div class="flex items-center justify-between mb-2">
                  <UiTermPopover
                    en="RSI 14"
                    vi="Sức mạnh tương đối"
                    desc="Dưới 30 là Quá Bán (có thể bật tăng), trên 70 là Quá Mua (có thể sắp sập). Ở mức giữa là Cân bằng."
                  >
                    <span class="text-xs font-bold text-slate-500">RSI 14</span>
                  </UiTermPopover>
                  <UBadge
                    :color="signalBadge(result.ta.signals.rsi).color"
                    variant="soft"
                    size="xs"
                  >
                    {{ signalBadge(result.ta.signals.rsi).label }}
                  </UBadge>
                </div>
                <div class="text-lg font-black">
                  {{ result.ta.rsi14.toFixed(1) }}
                </div>
                <p class="text-[11px] text-slate-500 mt-1">
                  {{ result.ta.rsi14 > 70 ? t('analyst.form.report.rsiOverbought') : result.ta.rsi14 < 30 ? t('analyst.form.report.rsiOversold') : t('analyst.form.report.rsiBalanced') }}
                </p>
              </div>
              <div class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 border border-slate-100 dark:border-gray-800">
                <div class="flex items-center justify-between mb-2">
                  <UiTermPopover
                    en="MACD"
                    vi="Trung bình động hội tụ"
                    desc="Đo lường gia tốc của giá. Giá trị dương (+) hoặc histogram xanh cho thấy phe Mua đang mạnh lên, là tín hiệu Tích cực."
                  >
                    <span class="text-xs font-bold text-slate-500">MACD</span>
                  </UiTermPopover>
                  <UBadge
                    :color="signalBadge(result.ta.signals.macd).color"
                    variant="soft"
                    size="xs"
                  >
                    {{ signalBadge(result.ta.signals.macd).label }}
                  </UBadge>
                </div>
                <div class="text-lg font-black tabular-nums">
                  {{ result.ta.macd.histogram >= 0 ? '+' : '' }}{{ result.ta.macd.histogram.toFixed(2) }}
                </div>
                <p class="text-[11px] text-slate-500 mt-1">
                  histogram
                </p>
              </div>
              <div class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 border border-slate-100 dark:border-gray-800">
                <div class="flex items-center justify-between mb-2">
                  <UiTermPopover
                    en="Bollinger Bands"
                    vi="Dải băng biến động"
                    desc="Gồm dải trên và dưới bao quanh giá. Giá thường có xu hướng bật lại khi chạm các dải này. Khoảng cách hẹp báo hiệu sắp có biến động."
                  >
                    <span class="text-xs font-bold text-slate-500">Bollinger</span>
                  </UiTermPopover>
                  <UBadge
                    :color="signalBadge(result.ta.signals.bb).color"
                    variant="soft"
                    size="xs"
                  >
                    {{ signalBadge(result.ta.signals.bb).label }}
                  </UBadge>
                </div>
                <div class="text-xs font-black tabular-nums">
                  ${{ fmtPrice(result.ta.bb.lower) }} - ${{ fmtPrice(result.ta.bb.upper) }}
                </div>
                <p class="text-[11px] text-slate-500 mt-1">
                  {{ t('analyst.form.report.bbVolatilityBand') }}
                </p>
              </div>
            </div>
          </UCard>

          <!-- NEWS -->
          <UCard v-if="result.news.length">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-newspaper"
                  class="w-4 h-4 text-primary-500"
                />
                <h3 class="text-sm font-extrabold text-slate-500 dark:text-gray-400">
                  {{ t('analyst.form.report.newsTitle') }}
                </h3>
              </div>
              <span class="text-xs text-slate-400">{{ t('analyst.form.report.newsMeta', { count: result.news.length }) }}</span>
            </div>
            <div class="space-y-2">
              <a
                v-for="(n, i) in result.news"
                :key="i"
                :href="n.url ?? '#'"
                target="_blank"
                rel="noopener"
                class="flex gap-3 items-start p-3 rounded-xl border border-slate-100 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800/30 transition group"
              >
                <div :class="['w-1 h-12 rounded-full shrink-0', newsSentimentMeta(n.sentiment).bar]" />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-bold leading-snug group-hover:text-primary-600 transition">{{ n.title }}</div>
                  <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <UBadge
                      :color="newsSentimentMeta(n.sentiment).color"
                      variant="soft"
                      size="xs"
                    >{{ newsSentimentMeta(n.sentiment).label }}</UBadge>
                    <span class="text-[11px] text-slate-500 font-semibold">{{ n.source }}</span>
                    <span class="text-[11px] text-slate-400">· {{ n.date }}</span>
                  </div>
                </div>
                <UIcon
                  name="i-lucide-external-link"
                  class="w-4 h-4 text-slate-300 group-hover:text-primary-500 mt-1"
                />
              </a>
            </div>
          </UCard>

          <!-- AI Narrative -->
          <div class="bg-linear-to-br from-primary-50 to-violet-50 dark:from-primary-950/30 dark:to-violet-950/30 rounded-2xl border-2 border-primary-200 dark:border-primary-800 p-6 relative">
            <UIcon
              name="i-lucide-sparkles"
              class="absolute top-4 right-4 w-5 h-5 text-primary-400"
            />
            <div class="flex items-center gap-2 mb-3">
              <UIcon
                name="i-lucide-bot"
                class="w-4 h-4 text-primary-600 dark:text-primary-400"
              />
              <h3 class="text-sm font-extrabold text-primary-700 dark:text-primary-300">
                {{ t('analyst.form.report.aiTitle') }}
              </h3>
            </div>
            <p class="text-sm leading-relaxed whitespace-pre-line">
              {{ result.ai.narrative }}
            </p>
            <div
              v-if="result.ai.keyPoints.length"
              class="mt-5 pt-5 border-t border-primary-200 dark:border-primary-800"
            >
              <div class="text-xs font-bold text-primary-700 dark:text-primary-300 mb-2 uppercase tracking-wider">
                {{ t('analyst.form.report.keyPoints') }}
              </div>
              <ul class="space-y-1.5">
                <li
                  v-for="(k, i) in result.ai.keyPoints"
                  :key="i"
                  class="text-sm flex gap-2 items-start"
                >
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="w-4 h-4 text-primary-500 mt-0.5 shrink-0"
                  />
                  <span>{{ k }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Trade Plan -->
          <UCard>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-clipboard-check"
                  class="w-4 h-4 text-primary-500"
                />
                <h3 class="text-sm font-extrabold text-slate-500 dark:text-gray-400">
                  {{ t('analyst.form.report.planTitle') }}
                </h3>
              </div>
              <UBadge
                :color="result.plan.leverage > 1 ? 'error' : 'success'"
                variant="soft"
                size="sm"
                :icon="result.plan.leverage > 1 ? 'i-lucide-gauge' : 'i-lucide-shield-check'"
              >
                {{ result.plan.leverage > 1 ? t('analyst.form.report.leverageBadge', { x: result.plan.leverage }) : 'Spot' }}
              </UBadge>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-900">
                <div class="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                  <UIcon
                    name="i-lucide-target"
                    class="w-3.5 h-3.5"
                  /> {{ t('analyst.form.report.entryZone') }}
                </div>
                <div class="text-lg font-black tabular-nums">
                  ${{ fmtPrice(result.plan.entryLow) }} - ${{ fmtPrice(result.plan.entryHigh) }}
                </div>
              </div>
              <div class="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900">
                <div class="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1">
                  <UIcon
                    name="i-lucide-coins"
                    class="w-3.5 h-3.5"
                  /> {{ t('analyst.form.report.suggestedSize') }}
                </div>
                <div class="text-lg font-black tabular-nums">
                  {{ result.plan.positionSize.toFixed(4) }} {{ result.coin.symbol }}
                </div>
                <div class="text-xs text-slate-500">
                  ≈ ${{ result.plan.notionalUSD.toLocaleString() }}
                  <span
                    v-if="result.plan.leverage > 1"
                    class="text-amber-600 dark:text-amber-400 font-semibold"
                  >{{ t('analyst.form.report.margin', { amount, x: result.plan.leverage }) }}</span>
                </div>
              </div>
              <div class="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 border border-red-100 dark:border-red-900">
                <div class="text-xs font-bold text-red-700 dark:text-red-300 mb-1 flex items-center gap-1">
                  <UIcon
                    name="i-lucide-shield-x"
                    class="w-3.5 h-3.5"
                  /> {{ t('analyst.form.report.stopLoss') }}
                </div>
                <div class="text-lg font-black tabular-nums">
                  ${{ fmtPrice(result.plan.stopLoss) }}
                </div>
                <div class="text-xs text-red-600">
                  {{ t('analyst.form.report.risk', { value: result.plan.riskUSD.toFixed(0) }) }}
                </div>
              </div>
              <div class="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-100 dark:border-amber-900">
                <div class="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
                  <UIcon
                    name="i-lucide-trophy"
                    class="w-3.5 h-3.5"
                  /> {{ t('analyst.form.report.takeProfit') }}
                </div>
                <div class="text-lg font-black tabular-nums">
                  ${{ fmtPrice(result.plan.takeProfit) }}
                </div>
                <div class="text-xs text-emerald-600">
                  {{ t('analyst.form.report.reward', { value: result.plan.rewardUSD.toFixed(0) }) }}
                </div>
              </div>
            </div>
            <!-- Cảnh báo thanh lý (chỉ khi có đòn bẩy) -->
            <div
              v-if="result.plan.leverage > 1 && result.plan.liquidationPrice != null"
              class="mt-4 flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-xl p-4"
            >
              <UIcon
                name="i-lucide-skull"
                class="w-6 h-6 text-red-500 shrink-0"
              />
              <div class="flex-1">
                <div class="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">
                  {{ t('analyst.form.report.liquidationPrice', { x: result.plan.leverage }) }}
                </div>
                <div class="text-xs text-red-600/80 dark:text-red-400/80">
                  {{ t('analyst.form.report.liquidationHint') }}
                </div>
              </div>
              <span class="text-xl font-black tabular-nums text-red-600 dark:text-red-400">${{ fmtPrice(result.plan.liquidationPrice) }}</span>
            </div>

            <div class="mt-4 flex items-center justify-between bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4">
              <span class="text-xs text-slate-500 font-medium">{{ t('analyst.form.report.rrRatio') }}</span>
              <span class="text-xl font-black">{{ result.plan.rrRatio.toFixed(2) }} : 1</span>
            </div>
          </UCard>

          <!-- Disclaimer -->
          <div class="flex gap-3 items-start p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
            <UIcon
              name="i-lucide-triangle-alert"
              class="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
            />
            <p class="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              <strong>{{ t('analyst.form.report.disclaimerStrong') }}</strong>{{ t('analyst.form.report.disclaimerRest') }}
            </p>
          </div>

          <!-- Actions -->
          <div class="space-y-3 pt-2">
            <UAlert
              v-if="saveError"
              color="error"
              variant="subtle"
              :title="saveError"
              icon="i-lucide-circle-x"
            />
            <div class="flex flex-col sm:flex-row gap-3">
              <UButton
                v-if="!saved"
                block
                size="xl"
                color="primary"
                icon="i-lucide-bookmark"
                :loading="saving"
                @click="onSaveReport"
              >
                {{ saving ? t('analyst.form.btn.saving') : t('analyst.form.btn.save') }}
              </UButton>
              <UButton
                v-else
                block
                size="xl"
                color="success"
                variant="soft"
                icon="i-lucide-check-circle-2"
                to="/analyst/history"
              >
                {{ t('analyst.form.btn.savedViewHistory') }}
              </UButton>
              <UButton
                block
                size="xl"
                variant="outline"
                color="neutral"
                icon="i-lucide-refresh-cw"
                @click="closeReport"
              >
                {{ t('analyst.form.btn.analyzeAnother') }}
              </UButton>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
@keyframes analyst-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.analyst-orbit {
  animation: analyst-spin 16s linear infinite;
}
</style>
