<template>
  <div
    class="bg-white dark:bg-[#14141c] ring-1 ring-slate-200 dark:ring-white/5 rounded-2xl shadow-sm flex flex-col max-h-[360px]"
  >
    <div
      class="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-transparent"
    >
      <div>
        <h3 class="font-bold text-slate-700 dark:text-white text-base">
          Coin phổ biến
        </h3>
        <p class="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
          Top 5 theo khối lượng giao dịch
        </p>
      </div>
      <UButton
        icon="i-heroicons-ellipsis-horizontal"
        color="neutral"
        variant="ghost"
        size="xs"
      />
    </div>

    <!-- Loading skeleton -->
    <div
      v-if="loading"
      class="flex-1 p-3 space-y-2"
    >
      <div
        v-for="i in 5"
        :key="i"
        class="h-12 rounded-lg bg-slate-100 dark:bg-white/5 animate-pulse"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!coins.length"
      class="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 py-8"
    >
      <UIcon
        name="i-heroicons-currency-dollar"
        class="w-8 h-8 opacity-20"
      />
      <p class="text-xs">
        Chưa có dữ liệu
      </p>
    </div>

    <!-- List -->
    <div
      v-else
      class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1"
    >
      <button
        v-for="coin in coins"
        :key="coin.symbol"
        class="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-white/5 transition-all"
        @click="goToOrders(coin)"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 overflow-hidden shrink-0"
          >
            <img
              v-if="coin.icon"
              :src="coin.icon"
              :alt="coin.symbol"
              class="w-6 h-6 object-cover"
            >
            <UIcon
              v-else
              name="i-heroicons-currency-dollar"
              class="w-5 h-5 text-slate-400"
            />
          </div>
          <div class="text-left">
            <p class="font-bold text-slate-800 dark:text-zinc-200 text-sm leading-tight">
              {{ coin.symbol }}
            </p>
            <p class="text-[10px] text-slate-400 font-medium truncate max-w-20">
              {{ coin.name }}
            </p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-semibold text-slate-800 dark:text-zinc-200 text-sm tabular-nums">
            ${{ formatPrice(coin.price) }}
          </p>
          <p
            class="text-[11px] font-semibold mt-0.5 tabular-nums"
            :class="coin.change24h >= 0 ? 'text-[#00e396]' : 'text-[#ff4560]'"
          >
            {{ formatChange(coin.change24h) }}
          </p>
        </div>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { HomePopularCoin } from '../../../server/dtos/home'

const props = defineProps<{
  coins: HomePopularCoin[]
  loading: boolean
}>()

function goToOrders(coin: HomePopularCoin) {
  // Điều hướng sang trang orders với coin được chọn sẵn
  void navigateTo(`/orders?symbol=${coin.symbol}USDT`)
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.3);
  border-radius: 10px;
}
</style>
