// composables/orders/useOrderBook.ts
import type { OrderBookResult, OrderBookLevel } from '../../../server/dtos/order'

/** 1 dòng sổ lệnh đã có sẵn % độ rộng depth bar (UI-only, không thuộc DTO server). */
export interface OrderBookRow extends OrderBookLevel {
  d: number
}

const MAX_DEPTH_BAR_PCT = 80

export function useOrderBook(symbol: Ref<string>, depth = 20) {
  const data = ref<OrderBookResult | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setInterval> | null = null

  async function fetchBook() {
    try {
      const res = await $fetch<OrderBookResult>(
        `/api/orders/book?symbol=${symbol.value}&depth=${depth}`
      )
      data.value = res
      error.value = null
    } catch (e) {
      error.value = (e as { statusMessage?: string })?.statusMessage || 'Không lấy được sổ lệnh'
    } finally {
      loading.value = false
    }
  }

  function start() {
    fetchBook()
    if (!timer) timer = setInterval(fetchBook, 1500)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  // Tự restart khi đổi symbol
  watch(symbol, () => {
    stop()
    loading.value = true
    start()
  })

  onUnmounted(stop)

  // ── Transform: thêm % độ rộng depth bar, bỏ level rỗng ──
  function withDepthBar(levels: OrderBookLevel[]): OrderBookRow[] {
    const filtered = levels.filter(r => r.quantity > 0)
    if (!filtered.length) return []
    const maxTotal = filtered[filtered.length - 1]?.total || 1
    return filtered.map(r => ({ ...r, d: (r.total / maxTotal) * MAX_DEPTH_BAR_PCT }))
  }

  // asks: đảo ngược để giá thấp nhất (gần spread) nằm sát giữa
  const asks = computed(() => [...withDepthBar(data.value?.asks ?? [])].reverse())
  const bids = computed(() => withDepthBar(data.value?.bids ?? []))

  const bestAsk = computed(() => data.value?.bestAsk ?? 0)
  const bestBid = computed(() => data.value?.bestBid ?? 0)

  const buyRatio = computed(() => {
    const totalBid = data.value?.bids?.reduce((s, r) => s + r.quantity, 0) ?? 0
    const totalAsk = data.value?.asks?.reduce((s, r) => s + r.quantity, 0) ?? 0
    const total = totalBid + totalAsk
    return total > 0 ? ((totalBid / total) * 100).toFixed(2) : '50.00'
  })
  const sellRatio = computed(() => (100 - parseFloat(buyRatio.value)).toFixed(2))

  return {
    data, loading, error, start, stop, refresh: fetchBook,
    asks, bids, bestAsk, bestBid, buyRatio, sellRatio
  }
}
