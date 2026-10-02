// HOME DTO — types cho dashboard trang chủ
// Không có business logic, chỉ là contracts.
import { z } from 'zod'

// ── Query schema dùng chung cho các endpoint home cần lọc theo ngày ──
export const DateRangeQuerySchema = z.object({
  from: z.string().optional(), // 'YYYY-MM-DD'
  to: z.string().optional() // 'YYYY-MM-DD'
})

export type DateRangeQuery = z.infer<typeof DateRangeQuerySchema>

export interface HomeMarketSentiment {
  buyCount: number
  sellCount: number
  total: number
  buyRatio: number // 0–100 integer
  sellRatio: number
  score: number // = buyRatio, dùng cho gauge needle
  label: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed'
}

export const HOME_SENTIMENT_LABEL: Record<HomeMarketSentiment['label'], string> = {
  extreme_fear: 'Sợ hãi tột độ',
  fear: 'Sợ hãi',
  neutral: 'Trung lập',
  greed: 'Tham lam',
  extreme_greed: 'Tham lam tột độ'
}

export const HOME_SENTIMENT_COLOR: Record<HomeMarketSentiment['label'], string> = {
  extreme_fear: '#ff4560',
  fear: '#f97316',
  neutral: '#eab308',
  greed: '#00e396',
  extreme_greed: '#059669'
}

export interface HomePopularCoin {
  id: number
  symbol: string
  name: string
  icon: string | null
  price: number
  change24h: number
  volume24h: number
}

export interface HomeRecentTrade {
  id: number
  pair: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  total: number
  status: string
  createdAt: string
}
