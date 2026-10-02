<!-- components/orders/pairs-list.vue -->
<template>
  <div
    class="flex-1 min-h-0 flex flex-col bg-white dark:bg-gray-900 rounded-xl ring-1 ring-gray-200/60 dark:ring-gray-800/60 overflow-hidden shadow-sm"
  >
    <div class="px-2.5 py-2 border-b border-gray-100 dark:border-gray-800">
      <UInput
        v-model="pairSearch"
        icon="i-heroicons-magnifying-glass"
        size="xs"
        placeholder="Tìm cặp giao dịch..."
        class="w-full"
      />
    </div>

    <UTabs
      v-model="activeQuote"
      :items="quoteTabItems"
      variant="link"
      size="xs"
      :content="false"
      :ui="{ list: 'overflow-x-auto scrollbar-hide border-b border-gray-100 dark:border-gray-800 shrink-0' }"
    />

    <div
      class="grid grid-cols-3 px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 shrink-0"
    >
      <span class="text-[9px] font-bold text-gray-400 uppercase">Cặp</span>
      <span class="text-[9px] font-bold text-gray-400 uppercase text-center">Giá</span>
      <span class="text-[9px] font-bold text-gray-400 uppercase text-right">24h</span>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-hide min-h-0">
      <div
        v-for="pair in filteredPairs"
        :key="pair.sym"
        class="grid grid-cols-3 px-2.5 py-1.25 cursor-pointer transition-colors rounded-lg mx-1 my-0.5"
        :class="selectedPair === pair.sym ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'"
        @click="selectedPair = pair.sym"
      >
        <span class="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">
          {{ pair.sym.split('/')[0] }}<span class="text-gray-400 text-[9px]">/BTC</span>
        </span>
        <span class="text-center text-[11px] font-semibold tabular-nums text-gray-700 dark:text-gray-300">{{ pair.p }}</span>
        <span
          class="text-right text-[11px] font-medium tabular-nums"
          :class="pair.c >= 0 ? 'text-emerald-500' : 'text-red-500'"
        >
          {{ formatChange(pair.c) }}
        </span>
      </div>

      <div
        v-if="filteredPairs.length === 0"
        class="flex flex-col items-center justify-center h-full gap-1.5 py-6"
      >
        <UIcon
          name="i-heroicons-list-bullet"
          class="w-5 h-5 text-gray-300 dark:text-gray-600"
        />
        <span class="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Chưa có cặp giao dịch</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
// TODO: nạp `pairs` từ API thật (ví dụ /api/coins lọc theo quote-asset) khi backend hỗ trợ.
// UI đã sẵn — chỉ cần thay `pairs` bằng dữ liệu thật + gọi load khi đổi activeQuote.
const quoteTabs = ['USD1', 'USD', 'BNB', 'BTC', 'ALTS', 'FIAT']
const quoteTabItems = quoteTabs.map(q => ({ label: q, value: q }))
const activeQuote = ref('BTC')

const pairSearch = ref('')
const selectedPair = ref('')
const pairs = ref<{ sym: string, p: string, c: number }[]>([])

const filteredPairs = computed(() =>
  pairSearch.value
    ? pairs.value.filter(p => p.sym.toLowerCase().includes(pairSearch.value.toLowerCase()))
    : pairs.value
)
</script>
