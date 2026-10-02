// composables/orders/useRecentTrades.ts
// Lệnh khớp gần đây cho 1 symbol. Dùng endpoint /api/orders/recent-trades.
import type { RecentTrade } from '../../../server/dtos/order'

export type { RecentTrade }

export function useRecentTrades(symbol: Ref<string>, intervalMs = 10_000) {
  const trades = ref<RecentTrade[]>([])
  let timer: ReturnType<typeof setInterval> | null = null

  async function fetchTrades() {
    try {
      trades.value = await $fetch<RecentTrade[]>('/api/orders/recent-trades', {
        query: { symbol: symbol.value, limit: 30 }
      })
    } catch { /* silent */ }
  }

  function start() {
    fetchTrades()
    if (!timer) timer = setInterval(fetchTrades, intervalMs)
  }
  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  // Đổi symbol → reset list + fetch lại ngay
  watch(symbol, () => {
    trades.value = []
    fetchTrades()
  })

  onUnmounted(stop)

  return { trades, start, stop, refresh: fetchTrades }
}
