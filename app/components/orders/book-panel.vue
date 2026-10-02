<!-- components/orders/book-panel.vue -->
<template>
  <div
    class="flex flex-col bg-white dark:bg-gray-900 rounded-xl ring-1 ring-gray-200/60 dark:ring-gray-800/60 overflow-hidden shadow-sm "
  >
    <div
      class="flex items-center justify-between px-3 py-2
                border-b border-gray-100 dark:border-gray-800 shrink-0"
    >
      <span class="text-sm font-bold text-gray-800 dark:text-white">Sổ lệnh</span>
      <div class="flex items-center gap-1">
        <!-- Toggle buttons -->
        <UButton
          size="xs"
          variant="ghost"
          :color="mode === 'both' ? 'primary' : 'neutral'"
          square
          @click="setMode('both')"
        >
          <UIcon
            name="i-ph-squares-four-duotone"
            class="text-base"
          />
        </UButton>

        <UButton
          size="xs"
          variant="ghost"
          :color="mode === 'asks' ? 'primary' : 'neutral'"
          square
          @click="setMode('asks')"
        >
          <UIcon
            name="i-ph-list-dashes-duotone"
            class="text-base text-red-400 rotate-180"
          />
        </UButton>

        <UButton
          size="xs"
          variant="ghost"
          :color="mode === 'bids' ? 'primary' : 'neutral'"
          square
          @click="setMode('bids')"
        >
          <UIcon
            name="i-ph-list-dashes-duotone"
            class="text-base text-emerald-400"
          />
        </UButton>
      </div>
    </div>

    <!-- Column labels -->
    <div
      class="grid grid-cols-[1.1fr_1fr_1fr] px-3 py-1.5 shrink-0 text-[10px] ring-1 ring-gray-200 dark:ring-gray-800 font-medium text-gray-400 dark:text-gray-500 tracking-wide"
    >
      <span>Giá (USDT)</span>
      <span class="text-center">KL ()</span>
      <span class="text-right">Tổng</span>
    </div>

    <!-- Body -->
    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col pb-1">
      <!-- Asks  -->
      <div
        v-if="mode !== 'bids'"
        class="flex-1 flex flex-col justify-end"
      >
        <div
          v-for="(r, i) in asks"
          :key="'a' + i"
          class="grid grid-cols-[1.2fr_1fr_1fr] px-3 py-0.5 relative
                 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          @click="emit('clickPrice', r.price)"
        >
          <div
            class="absolute inset-y-0 right-0 bg-red-50 dark:bg-red-900/20 transition-all"
            :style="{ width: r.d + '%' }"
          />
          <span class="relative text-[11px] font-semibold tabular-nums text-red-500 dark:text-red-400">
            {{ formatPrice(r.price) }}
          </span>
          <span class="relative text-[11px] font-medium tabular-nums text-center text-gray-600 dark:text-gray-300">
            {{ formatPrice(r.quantity) }}
          </span>
          <span class="relative text-[11px] font-medium tabular-nums text-right text-gray-500 dark:text-gray-400">
            {{ formatPrice(r.total) }}
          </span>
        </div>
      </div>

      <!-- Spread -->
      <div
        class="flex items-center justify-between px-3 py-1.5 my-1 shrink-0 bg-gray-50 dark:bg-gray-800/30 border-y border-gray-100 dark:border-gray-800/50"
      >
        <div class="flex items-center gap-1.5">
          <span
            class="text-lg font-semibold tabular-nums"
            :class="priceUp ? 'text-emerald-500' : 'text-red-500'"
          >
            {{ formatPrice(currentPrice) }}
          </span>
          <UIcon
            :name="priceUp ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
            class="w-4 h-4"
            :class="priceUp ? 'text-emerald-500' : 'text-red-500'"
          />
          <span class="text-xs text-gray-400 font-medium tabular-nums ml-1">
            ≈${{ formatPrice(currentPrice) }}
          </span>
        </div>
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="ghost"
          size="xs"
          square
        />
      </div>

      <!-- Bids  -->
      <div
        v-if="mode !== 'asks'"
        class="flex-1 flex flex-col justify-start"
      >
        <div
          v-for="(r, i) in bids"
          :key="'b' + i"
          class="grid grid-cols-[1.2fr_1fr_1fr] px-3 py-0.5 relative
                 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          @click="emit('clickPrice', r.price)"
        >
          <div
            class="absolute inset-y-0 right-0 bg-emerald-50 dark:bg-emerald-900/15 transition-all"
            :style="{ width: r.d + '%' }"
          />
          <span class="relative text-[11px] font-semibold tabular-nums text-emerald-500 dark:text-emerald-400">
            {{ formatPrice(r.price) }}
          </span>
          <span class="relative text-[11px] font-medium tabular-nums text-center text-gray-600 dark:text-gray-300">
            {{ formatPrice(r.quantity) }}
          </span>
          <span class="relative text-[11px] font-medium tabular-nums text-right text-gray-500 dark:text-gray-400">
            {{ formatPrice(r.total) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Ratio bar -->
    <div
      class="px-3 py-2.5 shrink-0 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-[10px] font-semibold bg-gray-50/50 dark:bg-gray-800/30"
    >
      <span class="text-gray-800 dark:text-gray-200">
        M <span class="text-emerald-500">{{ buyRatio }}%</span>
      </span>
      <UProgress
        :model-value="parseFloat(buyRatio)"
        color="success"
        class="flex-1"
        :ui="{
          indicator: 'bg-success-500', base: 'bg-red-500 dark:bg-red-50'
        }"
      />
      <span class="text-red-500">
        {{ sellRatio }}% <span class="text-gray-800 dark:text-gray-200">B</span>
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { OrderBookRow } from '../../composables/orders/useOrderBook'

const props = withDefaults(defineProps<{
  asks: OrderBookRow[]
  bids: OrderBookRow[]
  currentPrice: number
  priceUp: boolean
  buyRatio: string
  sellRatio: string
  obMode?: 'both' | 'asks' | 'bids'
}>(), {
  obMode: 'both'
})

const emit = defineEmits<{
  'clickPrice': [price: number]
  'update:obMode': [mode: ObMode]
}>()

type ObMode = 'both' | 'asks' | 'bids'

const mode = ref<ObMode>(props.obMode)

function setMode(m: ObMode) { mode.value = m }

watch(mode, val => emit('update:obMode', val))
watch(() => props.obMode, (val) => { mode.value = val })
</script>
