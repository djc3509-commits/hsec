// useHomeDashboard — nguồn DUY NHẤT cho data trang Home.
// Nhận `range` + `period` reactive → watch tự động refetch khi đổi.
// Pattern dashboard chuẩn: state share + auto re-sync, page chỉ truyền 2 ref.
import { format } from 'date-fns'
import type { Ref } from 'vue'
import type { HomeMarketSentiment, HomePopularCoin, HomeRecentTrade } from '../../../server/dtos/home'
import type { WalletChartPoint } from '../../../server/dtos/wallet'
import type { OrderStatsResponse, OrderListResult } from '../../../server/dtos/order'

export interface DashboardRange {
  start: Date
  end: Date
}

export type DashboardPeriod = 'daily' | 'weekly' | 'monthly'

// Field coin từ /api/coins mà dashboard dùng (khớp DTO Coin phía server)
type PopularCoinRaw = Omit<HomePopularCoin, 'change24h' | 'icon'> & {
  icon?: string | null
  changePercent24h: number
}

export function useHomeDashboard(
  range: Ref<DashboardRange>,
  period: Ref<DashboardPeriod>
) {
  const sentiment = ref<HomeMarketSentiment | null>(null)
  const orderStats = ref<OrderStatsResponse>({ pending: 0, filled: 0, canceled: 0 })
  const popularCoins = ref<HomePopularCoin[]>([])
  const recentTrades = ref<HomeRecentTrade[]>([])
  const chartPoints = ref<WalletChartPoint[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    const from = format(range.value.start, 'yyyy-MM-dd')
    const to = format(range.value.end, 'yyyy-MM-dd')

    try {
      await Promise.all([

        // Sentiment — filter date toàn hệ thống
        $fetch<HomeMarketSentiment>('/api/home/sentiment', {
          query: { from, to }
        }).then((r) => { sentiment.value = r }),

        // Order stats — TOÀN HỆ THỐNG (endpoint riêng để không phá status bar của user)
        $fetch<OrderStatsResponse>('/api/home/order-stats', {
          query: { from, to }
        }).then((r) => { orderStats.value = r }),

        // Popular coins — KHÔNG filter date (volume24h từ Binance là window 24h cố định)
        // Chấp nhận cả dạng bọc `data` (phòng hờ) → type lỏng, chỉ khai field cần dùng
        $fetch<{ items?: PopularCoinRaw[], data?: { items?: PopularCoinRaw[] } }>('/api/coins', {
          query: { sort: 'volume', limit: 5, page: 1 }
        }).then((r) => {
          const items = r?.items ?? r?.data?.items ?? []
          popularCoins.value = items.map(c => ({
            id: c.id,
            symbol: c.symbol,
            name: c.name,
            icon: c.icon ?? null,
            price: c.price,
            change24h: c.changePercent24h,
            volume24h: c.volume24h
          }))
        }),

        // Recent trades — của user, lọc theo date
        $fetch<OrderListResult>('/api/orders/list', {
          query: { status: 'FILLED', limit: 5, from, to }
        }).then((r) => {
          recentTrades.value = r.orders.map(o => ({
            id: o.id,
            pair: o.symbol,
            side: o.side,
            quantity: o.executedQuantity,
            price: o.price,
            total: parseFloat((o.price * o.executedQuantity).toFixed(2)),
            status: o.status,
            createdAt: o.createdAt
          }))
        }),

        // Wallet chart — P&L theo period + range
        $fetch<{ points?: WalletChartPoint[], data?: { chart?: WalletChartPoint[], points?: WalletChartPoint[] } }>('/api/wallet/chart', {
          query: { period: period.value, from, to }
        }).then((raw) => {
          chartPoints.value
            = Array.isArray(raw?.points)
              ? raw.points
              : Array.isArray(raw?.data?.chart)
                ? raw.data.chart
                : Array.isArray(raw?.data?.points) ? raw.data.points : []
        })
      ])
    } catch (err) {
      error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Lỗi tải dashboard'
    } finally {
      loading.value = false
    }
  }

  // Tự refetch mỗi khi range/period đổi
  watch(
    [range, period],
    fetchAll,
    { immediate: true, deep: true }
  )

  return {
    sentiment, orderStats, popularCoins, recentTrades, chartPoints,
    loading, error,
    refetch: fetchAll
  }
}
