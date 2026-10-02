<template>
  <div class="flex flex-col h-full min-h-0 overflow-y-auto scrollbar-hide">
    <div class="flex items-center justify-between px-4 py-3 shrink-0">
      <div class="flex items-center gap-2.5">
        <div
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
          :class="isBuy
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/10 text-red-600 dark:text-red-400'"
        >
          <UIcon
            :name="isBuy ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
            class="size-3.5"
          />
          {{ isBuy ? t('orders.form.buy') : t('orders.form.sell') }}
        </div>
        <span class="text-sm font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
          {{ coinSymbol }}<span class="text-gray-400 font-normal">/USDT</span>
        </span>
      </div>

      <div class="text-right">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">
          {{ t('orders.form.available') }}
        </p>
        <p class="text-xs font-medium text-gray-700 dark:text-gray-200 tabular-nums">
          {{ isBuy ? formatPrice(balance) : formatPrice(balance) }}
          <span class="text-gray-400 font-normal ml-0.5">{{ isBuy ? 'USDT' : coinSymbol }}</span>
        </p>
      </div>
    </div>

    <USeparator class="shrink-0" />

    <div class="flex-1 flex flex-col px-4 py-4 gap-3 min-h-0">
      <div class="flex flex-col gap-1.5">
        <label class="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{{ t('orders.form.price') }}</label>
        <div class="flex gap-2">
          <UInputNumber
            :model-value="price"
            :step="0.01"
            :min="0"
            :decrement="false"
            :increment="false"
            color="neutral"
            variant="soft"
            placeholder="0.00"
            :ui="{ root: 'flex-1', base: 'font-semibold ring ring-gray-300 dark:ring-gray-700 text-sm tabular-nums' }"
            @update:model-value="emit('update:price', $event ?? 0)"
          >
            <template #increment>
              <span class="text-[11px] font-medium text-gray-400 px-2.5 border-l border-gray-200 dark:border-gray-700">
                USDT
              </span>
            </template>
          </UInputNumber>
          <div class="flex gap-1">
            <UButton
              icon="i-lucide-minus"
              color="neutral"
              variant="soft"
              size="sm"
              square
              class="shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              @click="emit('update:price', Math.max(0, (price || 0) - 0.01))"
            />
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="soft"
              size="sm"
              square
              class="shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              @click="emit('update:price', (price || 0) + 0.01)"
            />
          </div>
          <UButton
            label="BBO"
            color="neutral"
            variant="outline"
            size="sm"
            class="shrink-0 text-xs font-semibold px-3 transition-colors"
            :class="isBuy
              ? 'hover:text-emerald-600 hover:border-emerald-400 dark:hover:text-emerald-400'
              : 'hover:text-red-600 hover:border-red-400 dark:hover:text-red-400'"
            @click="emit('click-bbo')"
          />
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{{ t('orders.form.quantity') }}</label>
        <div class="flex gap-2">
          <UInputNumber
            :model-value="qty"
            :step="0.00000000000001"
            :min="0"
            placeholder="0.00000"
            :decrement="false"
            :increment="false"
            color="neutral"
            variant="soft"
            :ui="{ root: 'flex-1', base: 'font-semibold text-sm ring ring-gray-300 dark:ring-gray-700 tabular-nums' }"
            @update:model-value="emit('update:qty', $event ?? 0)"
          >
            <template #increment>
              <span class="text-[11px] font-medium text-gray-400 px-2.5 border-l border-gray-200 dark:border-gray-700">
                {{ coinSymbol }}
              </span>
            </template>
          </UInputNumber>
          <div class="flex gap-1">
            <UButton
              icon="i-lucide-minus"
              color="neutral"
              variant="soft"
              size="sm"
              square
              class="shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              @click="emit('update:qty', Math.max(0, (qty || 0) - 0.001))"
            />
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="soft"
              size="sm"
              square
              class="shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              @click="emit('update:qty', (qty || 0) + 0.001)"
            />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-1.5">
        <button
          v-for="p in PCT_OPTIONS"
          :key="p"
          class="text-[11px] font-semibold py-1.5 rounded-lg border transition-all"
          :class="isBuy
            ? 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400'
            : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400'"
          @click="emit('set-pct', p)"
        >
          {{ p === 100 ? 'MAX' : `${p}%` }}
        </button>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {{ isBuy ? t('orders.form.totalWithFee') : t('orders.form.total') }}
        </label>
        <UInputNumber
          :model-value="total"
          :step="0.0000000000000000000001"
          :min="0"
          :placeholder="t('orders.form.totalPlaceholder')"
          :decrement="false"
          :increment="false"
          color="neutral"
          variant="soft"
          :ui="{ root: 'w-full', base: 'font-semibold text-sm ring ring-gray-300 dark:ring-gray-700 tabular-nums' }"
          @update:model-value="emit('update:total', $event ?? 0)"
        >
          <template #increment>
            <span class="text-[11px] font-medium text-gray-400 px-2.5 border-l border-gray-200 dark:border-gray-700">
              USDT
            </span>
          </template>
        </UInputNumber>
      </div>

      <div class="flex-1" />

      <div class="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div class="flex items-center gap-1.5 text-[11px] text-gray-400">
          <UIcon
            name="i-lucide-receipt"
            class="size-3.5 shrink-0"
          />
          <span>{{ t('orders.form.fee') }}</span>
          <span
            class="font-semibold tabular-nums"
            :class="isBuy ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'"
          >
            {{ formatChange(feeRate * 100).replace('+', '') }}
          </span>
          <span class="text-gray-300 dark:text-gray-600">·</span>
          <span class="font-medium text-gray-500 dark:text-gray-400 tabular-nums">
            ≈ {{ formatPrice(feeAmount) }} USDT
          </span>
        </div>
        <span
          class="text-sm font-semibold tabular-nums"
          :class="isBuy ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'"
        >
          ${{ formatPrice(total ?? 0) }}
        </span>
      </div>

      <UButton
        block
        size="lg"
        :color="isBuy ? 'success' : 'error'"
        :loading="isSubmitting"
        loading-icon="i-lucide-loader-circle"
        class="font-black tracking-wide mb-4"
        @click="emit('submit')"
      >
        <UIcon
          :name="isBuy ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
          class="size-4"
        />
        {{ isBuy ? t('orders.form.buy') : t('orders.form.sell') }} {{ coinSymbol }}
      </UButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
const { t } = useI18n()

const props = defineProps<{
  side: 'buy' | 'sell'
  coinSymbol: string
  balance: number
  price: number | null
  qty: number | null
  total: number | null
  feeRate: number
  feeAmount: number
  isSubmitting: boolean
}>()

const emit = defineEmits<{
  'update:price': [val: number]
  'update:qty': [val: number]
  'update:total': [val: number]
  'set-pct': [pct: number]
  'click-bbo': []
  'submit': []
}>()

const isBuy = computed(() => props.side === 'buy')

const PCT_OPTIONS = [25, 50, 75, 100] as const
</script>
