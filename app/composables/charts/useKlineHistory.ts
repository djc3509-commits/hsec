// useKlineHistory — Lấy nến lịch sử từ /api/klines/candles.
// State cục bộ cho mỗi component (giá real-time do useKlineStream lo riêng).
import type { Candle, KlineInterval } from '../../../server/dtos/kline'
import { DEFAULT_KLINE_INTERVAL, DEFAULT_KLINE_LIMIT } from '../../../server/dtos/kline'

export function useKlineHistory(symbol: MaybeRefOrGetter<string>) {
  const candles = ref<Candle[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const interval = ref<KlineInterval>(DEFAULT_KLINE_INTERVAL)
  const limit = ref(DEFAULT_KLINE_LIMIT)

  async function load() {
    const sym = toValue(symbol)
    if (!sym) return
    loading.value = true
    error.value = null
    try {
      candles.value = await $fetch<Candle[]>('/api/klines/candles', {
        query: {
          symbol: sym,
          interval: interval.value,
          limit: limit.value
        }
      })
    } catch (err) {
      error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Không tải được dữ liệu nến'
      candles.value = []
    } finally {
      loading.value = false
    }
  }

  // Đổi khung thời gian → reload (tránh shadow tên global setInterval)
  function setTimeframe(tf: KlineInterval) {
    interval.value = tf
    load()
  }

  return { candles, loading, error, interval, limit, load, setTimeframe }
}
