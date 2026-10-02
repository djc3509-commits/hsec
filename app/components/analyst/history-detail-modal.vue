<!--
  HistoryDetailModal — Chi tiết đầy đủ 1 đề xuất AI (mở khi bấm vào coin ở bảng).
  Cấu trúc theo form modal giao dịch: header + các section + footer.
  Kèm dịch: nhãn tiếng Việt + hover TermPopover (EN · VI + giải thích) cho thuật ngữ.
-->
<script setup lang="ts">
import TermPopover from '~/components/ui/term-popover.vue'
import type { RecDetail } from '../../../server/dtos/analyst'
import type { Term } from '~/composables/analyst/useTradingGlossary'

const props = defineProps<{
  open: boolean
  id: number | null
  icon?: string | null
}>()
const emits = defineEmits<{ 'update:open': [value: boolean] }>()

const { t, locale } = useI18n()
const { getDetail } = useAnalystHistory()
const { term, tlabel, statusBadge, statusTerm, fmtPrice } = useTradingGlossary()

const state = reactive({
  detail: null as RecDetail | null,
  loading: false,
  error: null as string | null
})

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen || !props.id) return
    state.loading = true
    state.error = null
    state.detail = null
    try {
      state.detail = await getDetail(props.id)
    } catch (err: any) {
      state.error = err?.data?.statusMessage || t('analyst.modal.loadError')
    } finally {
      state.loading = false
    }
  },
  { immediate: true }
)

// ─── Dẫn xuất hiển thị ───────────────────────────────────────
const d = computed(() => state.detail)
const isLong = computed(() => d.value?.direction === 'UP')

function fmtDateTime(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleString(locale.value === 'vi' ? 'vi-VN' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function money(n: number | null): string {
  return n == null ? '—' : `$${fmtPrice(n)}`
}

// Risk/Reward từ entry/SL/TP
const rrRatio = computed(() => {
  if (!d.value) return null
  const risk = Math.abs(d.value.entryPrice - d.value.stopLoss)
  const reward = Math.abs(d.value.takeProfit - d.value.entryPrice)
  if (!risk) return null
  return (reward / risk)
})

interface Field { label: string, term?: Term, value: string, cls?: string }

// Kế hoạch lệnh (có hover thuật ngữ)
const planFields = computed<Field[]>(() => {
  if (!d.value) return []
  const sym = d.value.symbol
  return [
    { label: t('analyst.modal.field.entry'), term: term('entry'), value: money(d.value.entryPrice) },
    { label: t('analyst.modal.field.stopLoss'), term: term('stopLoss'), value: money(d.value.stopLoss), cls: 'text-error' },
    { label: t('analyst.modal.field.takeProfit'), term: term('takeProfit'), value: money(d.value.takeProfit), cls: 'text-success' },
    { label: t('analyst.modal.field.size'), term: term('positionSize'), value: `${d.value.positionSize} ${sym}` },
    { label: t('analyst.modal.field.exit'), term: term('exit'), value: money(d.value.exitPrice) },
    { label: t('analyst.modal.field.liquidation'), term: term('liquidation'), value: d.value.leverage > 1 ? money(d.value.liquidationPrice) : t('analyst.modal.spot') },
    { label: t('analyst.modal.field.riskReward'), term: term('riskReward'), value: rrRatio.value ? `1 : ${rrRatio.value.toFixed(2)}` : '—' }
  ]
})

// Cấu hình phân tích
const configFields = computed<Field[]>(() => {
  if (!d.value) return []
  return [
    { label: t('analyst.modal.cfg.horizon'), value: tlabel('horizon', d.value.horizon) },
    { label: t('analyst.modal.cfg.risk'), value: tlabel('risk', d.value.risk) },
    { label: t('analyst.modal.cfg.experience'), value: tlabel('experience', d.value.experience) },
    { label: t('analyst.modal.cfg.goal'), value: tlabel('goal', d.value.goal) },
    { label: t('analyst.modal.cfg.style'), value: tlabel('style', d.value.style) },
    { label: t('analyst.modal.cfg.reportDepth'), value: tlabel('reportDepth', d.value.reportDepth) },
    { label: t('analyst.modal.cfg.tone'), value: tlabel('tone', d.value.tone) },
    { label: t('analyst.modal.cfg.stopLossKind'), value: tlabel('stopLossKind', d.value.stopLossKind) },
    { label: t('analyst.modal.cfg.marketBias'), value: tlabel('marketBias', d.value.marketBias) },
    { label: t('analyst.modal.cfg.entryStrategy'), value: tlabel('entryStrategy', d.value.entryStrategy) },
    { label: t('analyst.modal.cfg.maxRisk'), value: `${d.value.maxRiskPct}%` },
    { label: t('analyst.modal.cfg.profitTarget'), value: d.value.profitTargetPct != null ? `${d.value.profitTargetPct}%` : '—' }
  ]
})

function close() {
  emits('update:open', false)
}
</script>

<template>
  <UModal
    :open="props.open"
    :ui="{ content: 'w-full sm:max-w-3xl', body: 'sm:pt-2' }"
    @update:open="emits('update:open', $event)"
  >
    <!-- Header -->
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <div class="size-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-primary/10">
          <img
            v-if="icon"
            :src="icon"
            :alt="d?.symbol"
            class="size-7 rounded-full"
          >
          <UIcon
            v-else
            name="i-lucide-sparkles"
            class="size-5 text-primary"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-base font-bold leading-tight truncate flex items-center gap-2">
            {{ t('analyst.modal.title') }} · {{ d?.symbol || '—' }}
            <UBadge
              v-if="d"
              :color="isLong ? 'success' : 'error'"
              variant="soft"
              size="xs"
              :icon="isLong ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
              :label="isLong ? 'LONG' : 'SHORT'"
            />
          </p>
          <p
            v-if="d"
            class="text-xs text-muted font-mono mt-0.5 truncate"
          >
            #{{ d.id }} · {{ fmtDateTime(d.createdAt) }}
          </p>
        </div>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          class="shrink-0"
          @click="close"
        />
      </div>
    </template>

    <!-- Body -->
    <template #body>
      <!-- Loading -->
      <div
        v-if="state.loading"
        class="space-y-3"
      >
        <USkeleton class="h-24" />
        <USkeleton class="h-40" />
        <USkeleton class="h-32" />
      </div>

      <!-- Error -->
      <div
        v-else-if="state.error"
        class="text-center py-10 text-error text-sm"
      >
        {{ state.error }}
      </div>

      <!-- Detail -->
      <div
        v-else-if="d"
        class="flex flex-col gap-4 p-1"
      >
        <!-- Tổng quan -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div class="rounded-lg border border-default p-3">
            <TermPopover v-bind="term('direction')">
              <p class="text-[11px] uppercase tracking-wide text-muted">
                {{ t('analyst.modal.ov.direction') }}
              </p>
            </TermPopover>
            <p
              class="text-sm font-bold mt-1"
              :class="isLong ? 'text-success' : 'text-error'"
            >
              {{ isLong ? 'LONG' : 'SHORT' }}
            </p>
          </div>

          <div class="rounded-lg border border-default p-3">
            <TermPopover v-bind="term('confidence')">
              <p class="text-[11px] uppercase tracking-wide text-muted">
                {{ t('analyst.modal.ov.confidence') }}
              </p>
            </TermPopover>
            <p class="text-sm font-bold tabular-nums mt-1">
              {{ d.confidence }}%
            </p>
          </div>

          <div class="rounded-lg border border-default p-3">
            <p class="text-[11px] uppercase tracking-wide text-muted mb-1.5">
              {{ t('analyst.modal.ov.status') }}
            </p>
            <TermPopover
              v-bind="statusTerm(d.status)"
              :hint="false"
            >
              <UBadge
                :color="statusBadge(d.status).color"
                variant="soft"
                size="xs"
                :icon="statusBadge(d.status).icon"
                :label="statusBadge(d.status).label"
              />
            </TermPopover>
          </div>

          <div class="rounded-lg border border-default p-3">
            <p class="text-[11px] uppercase tracking-wide text-muted">
              {{ t('analyst.modal.ov.capital') }}
            </p>
            <p class="text-sm font-semibold tabular-nums mt-1">
              ${{ d.amount.toLocaleString() }}
            </p>
          </div>

          <div class="rounded-lg border border-default p-3">
            <TermPopover v-bind="term('leverage')">
              <p class="text-[11px] uppercase tracking-wide text-muted">
                {{ t('analyst.modal.ov.leverage') }}
              </p>
            </TermPopover>
            <p class="text-sm font-semibold tabular-nums mt-1">
              {{ d.leverage > 1 ? `x${d.leverage}` : 'Spot' }}
            </p>
          </div>

          <div class="rounded-lg border border-default p-3">
            <TermPopover v-bind="term('pnl')">
              <p class="text-[11px] uppercase tracking-wide text-muted">
                {{ t('analyst.modal.ov.pnl') }}
              </p>
            </TermPopover>
            <p
              class="text-sm font-bold tabular-nums mt-1"
              :class="d.pnl > 0 ? 'text-success' : d.pnl < 0 ? 'text-error' : 'text-muted'"
            >
              {{ d.pnl > 0 ? '+' : '' }}${{ d.pnl.toFixed(2) }}
            </p>
          </div>
        </div>

        <!-- Kế hoạch lệnh -->
        <div class="rounded-lg border border-default overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-2.5 bg-elevated/40 border-b border-default">
            <UIcon
              name="i-lucide-target"
              class="size-4 text-primary shrink-0"
            />
            <span class="text-sm font-semibold">{{ t('analyst.modal.sec.plan') }}</span>
          </div>
          <div class="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div
              v-for="f in planFields"
              :key="f.label"
            >
              <TermPopover
                v-if="f.term"
                v-bind="f.term"
              >
                <p class="text-[11px] uppercase tracking-wide text-muted">
                  {{ f.label }}
                </p>
              </TermPopover>
              <p
                v-else
                class="text-[11px] uppercase tracking-wide text-muted"
              >
                {{ f.label }}
              </p>
              <p
                class="text-sm font-semibold tabular-nums mt-1"
                :class="f.cls"
              >
                {{ f.value }}
              </p>
            </div>
          </div>
        </div>

        <!-- Phân tích AI -->
        <div class="rounded-lg border border-default overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-2.5 bg-elevated/40 border-b border-default">
            <UIcon
              name="i-lucide-sparkles"
              class="size-4 text-primary shrink-0"
            />
            <span class="text-sm font-semibold">{{ t('analyst.modal.sec.ai') }}</span>
          </div>
          <div class="p-4 space-y-4 text-sm">
            <p class="leading-relaxed whitespace-pre-wrap text-default">
              {{ d.aiNarrative || '—' }}
            </p>

            <div v-if="d.aiReasons.length">
              <p class="text-[11px] uppercase tracking-wide text-muted mb-2">
                {{ t('analyst.modal.sec.reasons') }}
              </p>
              <ul class="space-y-1.5">
                <li
                  v-for="(r, i) in d.aiReasons"
                  :key="i"
                  class="flex items-start gap-2"
                >
                  <UIcon
                    name="i-lucide-check"
                    class="size-4 text-success shrink-0 mt-0.5"
                  />
                  <span>{{ r }}</span>
                </li>
              </ul>
            </div>

            <div v-if="d.aiKeyPoints.length">
              <p class="text-[11px] uppercase tracking-wide text-muted mb-2">
                {{ t('analyst.modal.sec.keyPoints') }}
              </p>
              <ul class="space-y-1.5">
                <li
                  v-for="(k, i) in d.aiKeyPoints"
                  :key="i"
                  class="flex items-start gap-2"
                >
                  <UIcon
                    name="i-lucide-circle-alert"
                    class="size-4 text-warning shrink-0 mt-0.5"
                  />
                  <span>{{ k }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Cấu hình phân tích -->
        <div class="rounded-lg border border-default overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-2.5 bg-elevated/40 border-b border-default">
            <UIcon
              name="i-lucide-sliders-horizontal"
              class="size-4 text-primary shrink-0"
            />
            <span class="text-sm font-semibold">{{ t('analyst.modal.sec.config') }}</span>
          </div>
          <div class="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div
              v-for="f in configFields"
              :key="f.label"
            >
              <p class="text-[11px] uppercase tracking-wide text-muted">
                {{ f.label }}
              </p>
              <p class="text-sm font-medium mt-0.5">
                {{ f.value }}
              </p>
            </div>
          </div>
        </div>

        <!-- Kỹ thuật -->
        <div class="rounded-lg border border-default overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-2.5 bg-elevated/40 border-b border-default">
            <UIcon
              name="i-lucide-cog"
              class="size-4 text-primary shrink-0"
            />
            <span class="text-sm font-semibold">{{ t('analyst.modal.sec.tech') }}</span>
          </div>
          <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p class="text-[11px] uppercase tracking-wide text-muted">
                {{ t('analyst.modal.tech.model') }}
              </p>
              <p class="font-mono text-xs mt-0.5 break-all">
                {{ d.model || '—' }}
              </p>
            </div>
            <div>
              <p class="text-[11px] uppercase tracking-wide text-muted">
                {{ t('analyst.modal.tech.elapsed') }}
              </p>
              <p class="font-medium mt-0.5">
                {{ d.elapsedMs ? `${d.elapsedMs} ms` : '—' }}
              </p>
            </div>
            <div>
              <p class="text-[11px] uppercase tracking-wide text-muted">
                {{ t('analyst.modal.tech.createdAt') }}
              </p>
              <p class="font-medium mt-0.5">
                {{ fmtDateTime(d.createdAt) }}
              </p>
            </div>
            <div>
              <p class="text-[11px] uppercase tracking-wide text-muted">
                {{ t('analyst.modal.tech.closedAt') }}
              </p>
              <p class="font-medium mt-0.5">
                {{ fmtDateTime(d.closedAt) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else
        class="text-center py-8 text-muted text-sm"
      >
        {{ t('analyst.modal.noData') }}
      </div>
    </template>

    <!-- Footer -->
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          to="/analyst"
          color="neutral"
          variant="ghost"
          icon="i-lucide-sparkles"
          :label="t('analyst.modal.newAnalysis')"
        />
        <UButton
          color="primary"
          variant="solid"
          :label="t('analyst.modal.close')"
          @click="close"
        />
      </div>
    </template>
  </UModal>
</template>
