// ─────────────────────────────────────────────────────────────
// ORDER DTO — Hợp đồng kiểu dữ liệu cho domain `order`.
// Dùng zod cho mọi schema input (client → server): 1 nguồn duy nhất
// cho validate + type. Response types vẫn là interface vì server tự build.
// MỌI số là `number` (service parse DECIMAL → number) — FE không cần parseFloat.
// ─────────────────────────────────────────────────────────────
import { z } from 'zod'

// ── ENUM SCHEMAS ───────────────────────────────────────────
export const OrderSideSchema = z.enum(['BUY', 'SELL'])
export const OrderTypeSchema = z.enum(['MARKET', 'LIMIT'])
export const OrderStatusSchema = z.enum(['PENDING', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED'])

export type OrderSide = z.infer<typeof OrderSideSchema>
export type OrderType = z.infer<typeof OrderTypeSchema>
export type OrderStatus = z.infer<typeof OrderStatusSchema>

// ── REQUEST SCHEMAS (client → server) ──────────────────────

/**
 * Tạo lệnh mới. LIMIT yêu cầu price > 0; MARKET sẽ lấy best opposite từ sổ lệnh.
 */
export const CreateOrderSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9]{2,20}$/, 'symbol không hợp lệ'),
  side: OrderSideSchema,
  type: OrderTypeSchema,
  price: z.number().positive().optional(),
  quantity: z.number().positive('quantity phải > 0')
}).refine(d => d.type !== 'LIMIT' || (d.price && d.price > 0), {
  message: 'LIMIT yêu cầu price > 0',
  path: ['price']
})

export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>

/** Query khi list lệnh. */
export const OrderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  status: OrderStatusSchema.optional(),
  symbol: z.string().optional(),
  from: z.string().optional(), // 'YYYY-MM-DD'
  to: z.string().optional() // 'YYYY-MM-DD'
})

export type OrderListQuery = z.infer<typeof OrderListQuerySchema>

/** Query cho thống kê lệnh theo trạng thái. */
export const OrderStatsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
})

export type OrderStatsQuery = z.infer<typeof OrderStatsQuerySchema>

/** Query cho order book. */
export const OrderBookQuerySchema = z.object({
  symbol: z.string().default('BTCUSDT'),
  depth: z.coerce.number().int().min(1).max(50).default(20)
})

export type OrderBookQuery = z.infer<typeof OrderBookQuerySchema>

// ── RESPONSE TYPES (server → client) ───────────────────────

/** 1 lệnh trong list. */
export interface Order {
  id: number
  symbol: string
  side: OrderSide
  type: OrderType
  price: number
  quantity: number
  executedQuantity: number
  status: OrderStatus
  createdAt: string
  updatedAt: string
}

/** Một giao dịch khớp gắn với 1 order. */
export interface OrderTrade {
  id: number
  side: OrderSide
  role: 'MAKER' | 'TAKER'
  quantity: number
  price: number
  totalCost: number
  feeAmount: number
  createdAt: string
}

/** Order detail (kèm trades đã khớp). */
export interface OrderDetail extends Order {
  remainingQuantity: number
  trades: OrderTrade[]
  lastMatchedAt: string | null // null nếu chưa khớp lần nào (PENDING)
  lastRole: 'MAKER' | 'TAKER' | null
  totalFilledValue: number // SUM(totalCost) các trade — giá trị USDT phần đã khớp
  totalFeeUsdt: number // SUM(fee) — luôn USDT
  totalReceivedQty: number // BUY: tổng coin đã nhận | SELL: 0 (không dùng)
}

/** Kết quả khi vừa tạo lệnh thành công. */
export interface OrderCreated {
  id: number
  userId: number
  symbol: string
  side: OrderSide
  type: OrderType
  price: number
  quantity: number
  tradingAmount: number
  feeRate: number // 0.0005 = 0.05%
  feeAmount: number
  totalRequired: number
  executedQuantity: number
  status: OrderStatus
}

/** Kết quả pagination cho list. */
export interface OrderListResult {
  orders: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ── ORDER BOOK ─────────────────────────────────────────────
export interface OrderBookLevel {
  price: number
  quantity: number
  total: number // cumulative qty
}
export interface OrderBookResult {
  symbol: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  spread: number
  spreadPct: number
  bestBid: number
  bestAsk: number
  updatedAt: string
}

// ── FEE ────────────────────────────────────────────────────
export interface FeeConfig {
  maker: number // 0.0005 = 0.05%
  taker: number // 0.001  = 0.1%
}

export const DEFAULT_MAKER_FEE = 0.0005
export const DEFAULT_TAKER_FEE = 0.001

// ── CANCEL ─────────────────────────────────────────────────
export interface CancelOrderResult {
  id: number
  status: 'CANCELED'
  refunded: number // qty/cash hoàn lại
}

// ── STATS ──────────────────────────────────────────────────
export interface OrderStatsResponse {
  pending: number
  filled: number
  canceled: number
}

// ── RECENT TRADES (public market feed) ─────────────────────
export const RecentTradesQuerySchema = z.object({
  symbol: z.string().default('BTCUSDT'),
  limit: z.coerce.number().int().min(1).max(50).default(20)
})

export type RecentTradesQuery = z.infer<typeof RecentTradesQuerySchema>

export interface RecentTrade {
  p: string // price (formatted)
  q: string // quantity (formatted)
  time: string // 'HH:mm:ss'
  side: 'buy' | 'sell'
}
