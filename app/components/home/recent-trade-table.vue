<template>
  <div
    class="bg-white dark:bg-[#14141c] ring-1 ring-slate-200 dark:ring-white/5 rounded-2xl shadow-sm flex flex-col overflow-hidden"
  >
    <div
      class="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-transparent"
    >
      <div>
        <h3 class="font-bold text-slate-700 dark:text-white text-base">
          Lịch sử giao dịch
        </h3>
        <p class="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
          Lệnh đã khớp · {{ fullLabel }}
        </p>
      </div>
      <UButton
        label="Xem tất cả"
        color="primary"
        variant="ghost"
        trailing-icon="i-heroicons-arrow-right"
        size="xs"
        @click="goToOrders"
      />
    </div>

    <!-- Loading skeleton -->
    <div
      v-if="loading"
      class="p-4 space-y-3"
    >
      <div
        v-for="i in 4"
        :key="i"
        class="h-10 rounded-lg bg-slate-100 dark:bg-white/5 animate-pulse"
      />
    </div>

    <!-- Empty -->
    <div
      v-else-if="!trades.length"
      class="py-12 flex flex-col items-center justify-center gap-2 text-slate-400"
    >
      <UIcon
        name="i-heroicons-document-text"
        class="w-8 h-8 opacity-20"
      />
      <p class="text-sm">
        Chưa có lệnh nào được khớp
      </p>
    </div>

    <!-- Table -->
    <div
      v-else
      class="overflow-x-auto"
    >
      <table class="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          <tr
            class="bg-slate-50 dark:bg-white/5 text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider"
          >
            <th class="px-5 py-3 border-b border-slate-200 dark:border-white/10">
              Thời gian
            </th>
            <th class="px-5 py-3 border-b border-slate-200 dark:border-white/10">
              Cặp
            </th>
            <th class="px-5 py-3 border-b border-slate-200 dark:border-white/10">
              Loại
            </th>
            <th class="px-5 py-3 border-b border-slate-200 dark:border-white/10 text-right">
              Khối lượng
            </th>
            <th class="px-5 py-3 border-b border-slate-200 dark:border-white/10 text-right">
              Giá khớp
            </th>
            <th class="px-5 py-3 border-b border-slate-200 dark:border-white/10 text-right">
              Tổng
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="trade in trades"
            :key="trade.id"
            class="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 cursor-pointer"
            @click="goToOrders"
          >
            <td class="px-5 py-3.5 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
              {{ new Date(trade.createdAt).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit' }) }}
            </td>
            <td class="px-5 py-3.5 font-bold text-sm text-slate-700 dark:text-zinc-200">
              {{ trade.pair }}
            </td>
            <td class="px-5 py-3.5">
              <UBadge
                :label="trade.side === 'BUY' ? 'MUA' : 'BÁN'"
                :color="trade.side === 'BUY' ? 'success' : 'error'"
                variant="soft"
                size="xs"
                class="font-black"
              />
            </td>
            <td class="px-5 py-3.5 text-right text-sm font-semibold text-slate-700 dark:text-zinc-200 tabular-nums">
              {{ formatPrice(trade.quantity) }}
            </td>
            <td class="px-5 py-3.5 text-right text-xs text-slate-500 dark:text-zinc-400 tabular-nums">
              ${{ formatPrice(trade.price) }}
            </td>
            <td
              class="px-5 py-3.5 text-right text-sm font-semibold tabular-nums"
              :class="trade.side === 'BUY' ? 'text-emerald-500' : 'text-red-400'"
            >
              ${{ formatPrice(trade.total) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { HomeRecentTrade } from '../../../server/dtos/home'

const props = defineProps<{
  trades: HomeRecentTrade[]
  loading: boolean
  range?: { start: Date, end: Date }
  period?: 'daily' | 'weekly' | 'monthly'
}>()

const { fullLabel } = useRangeLabel(
  computed(() => props.range ?? { start: new Date(), end: new Date() }),
  computed(() => props.period ?? 'daily')
)

function goToOrders() {
  void navigateTo('/orders')
}
</script>
