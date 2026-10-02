// composables/orders/useOrderStats.ts
import { ref, onUnmounted } from 'vue'
import type { OrderStatsResponse } from '../../../server/dtos/order'

export function useOrderStats() {
  const stats = ref<OrderStatsResponse>({ pending: 0, filled: 0, canceled: 0 })
  let timer: number | null = null // Fix lỗi 2: number thay vì ReturnType<typeof setInterval>
  let isFetching = false

  async function fetchStats() {
    if (isFetching) return
    isFetching = true
    try {
      // Fix lỗi 1: dùng /api/orders/stats (1 query) thay vì 3 call /list song song
      const res = await $fetch<OrderStatsResponse>('/api/orders/stats')
      stats.value = res
    } catch {
      /* Giữ nguyên trạng thái cũ nếu gặp lỗi network */
    } finally {
      isFetching = false
    }
  }

  function start() {
    if (timer) return
    fetchStats() // Fix lỗi 3: fetch() → fetchStats()
    timer = window.setInterval(fetchStats, 5000) as number // window.setInterval rõ ràng trả number
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onUnmounted(stop)

  return { stats, start, stop, refresh: fetchStats }
}
