// ─────────────────────────────────────────────────────────────
// WALLET DTO — Hợp đồng kiểu dữ liệu cho domain `wallet`.
// Dùng chung cho SERVER (service/api) lẫn CLIENT (composable/component).
// MỌI số là `number` (service parse từ DECIMAL) — FE không cần parseFloat.
// ─────────────────────────────────────────────────────────────

// ── HOLDING (1 coin đang giữ trong ví) ─────────────────────
export interface Holding {
  id: number
  coinId: number
  symbol: string // 'BTC'
  name: string // 'Bitcoin'
  icon: string | null
  amount: number // số lượng coin đang giữ
  avgBuyPrice: number // giá vốn trung bình
  currentPrice: number // giá thị trường (DB sync 30s)
  value: number // amount × currentPrice
  pnl: number // amount × (currentPrice − avgBuyPrice)
  pnlPercent: number // %
  marketCap: number
  volume24h: number
}

// ── OVERVIEW (tổng quan ví) ────────────────────────────────
export interface WalletOverview {
  id: number
  userId: number
  cashBalance: number // tiền mặt khả dụng
  coinsValue: number // tổng giá trị coin theo giá hiện tại
  totalValue: number // cashBalance + coinsValue
  holdingsCount: number // số coin đang giữ
  updatedAt: string
}

// ── CHART P&L ──────────────────────────────────────────────
export type ChartPeriod = 'daily' | 'weekly' | 'monthly'

export const CHART_PERIODS = ['daily', 'weekly', 'monthly'] as const
export const DEFAULT_CHART_PERIOD: ChartPeriod = 'daily'

export function isValidChartPeriod(v: unknown): v is ChartPeriod {
  return typeof v === 'string' && (CHART_PERIODS as readonly string[]).includes(v)
}

export interface WalletChartQuery {
  period?: ChartPeriod
  from?: string // 'YYYY-MM-DD'
  to?: string // 'YYYY-MM-DD'
}

/**
 * 1 điểm trên biểu đồ P&L.
 * pnl           = sellRevenue − buyCost  (cash flow P&L trong ngày)
 * cumulativePnl = chạy tổng pnl từ điểm đầu
 */
export interface WalletChartPoint {
  date: string
  buyCost: number
  sellRevenue: number
  orderCount: number
  pnl: number
  cumulativePnl: number
}

export interface WalletChartResult {
  points: WalletChartPoint[]
  summary: {
    totalBuy: number
    totalSell: number
    totalOrders: number
    period: ChartPeriod
  }
}

// ── TRANSACTIONS (lịch sử giao dịch gần đây) ──────────────
export type TransactionType = 'buy' | 'sell' | 'deposit' | 'withdraw'

export interface WalletTransaction {
  id: number
  type: TransactionType
  symbol: string // base coin: 'BTC'
  amount: number
  price: number
  total: number
  note: string
  time: string // 'HH:mm' (locale 'vi-VN')
  date: string // 'DD/MM/YYYY' (locale 'vi-VN')
  status: 'completed' | 'pending'
}

export interface WalletTransactionQuery {
  limit?: number
  offset?: number
}

// ── DEPOSIT ────────────────────────────────────────────────
export interface DepositRequest {
  amount: number
  currency?: string // 'USDT'
  paymentMethod?: string // 'bank_transfer', 'card', ...
}

export interface DepositResult {
  previousBalance: number
  newBalance: number
  amount: number
  currency: string
  method: string
  timestamp: string
}
