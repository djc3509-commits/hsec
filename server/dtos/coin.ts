// ─────────────────────────────────────────────────────────────
// COIN DTO — Hợp đồng kiểu dữ liệu cho domain `coin`.
// Dùng chung cho SERVER (service/api) lẫn CLIENT (composable/component).
// Import: import type { Coin } from '#dtos/coin'
// ─────────────────────────────────────────────────────────────

// ── SORT & QUERY (client → server) ───────────────────────────

/** Kiểu sắp xếp danh sách coin. */
export type CoinSort = 'rank' | 'gainers' | 'losers' | 'volume'

/** Danh sách sort hợp lệ — nguồn duy nhất để validate ở server. */
export const COIN_SORTS = ['rank', 'gainers', 'losers', 'volume'] as const
export const DEFAULT_COIN_SORT: CoinSort = 'rank'
export const DEFAULT_COIN_LIMIT = 50

/** Validate 1 giá trị có phải sort hợp lệ không. */
export function isValidCoinSort(v: unknown): v is CoinSort {
  return typeof v === 'string' && (COIN_SORTS as readonly string[]).includes(v)
}

/**
 * CoinListQuery — tham số lấy danh sách coin (GET /api/coins).
 * @property page   - trang, bắt đầu từ 1
 * @property limit  - số coin mỗi trang
 * @property search - tìm theo symbol hoặc name
 * @property sort   - kiểu sắp xếp
 */
export interface CoinListQuery {
  page?: number
  limit?: number
  search?: string
  sort?: CoinSort
}

// ── RESPONSE (server → client) ───────────────────────────────

/**
 * Coin — 1 cá thể coin, service đã map sẵn từ bảng virtual_coins.
 * MỌI số là `number` (service parse từ DECIMAL) → FE KHÔNG cần parseFloat nữa.
 */
export interface Coin {
  id: number
  symbol: string // 'BTC' (base, không kèm USDT)
  name: string // 'Bitcoin'
  icon: string | null
  price: number // currentPrice — giá nền (sync 30s)
  change24h: number // đổi giá tuyệt đối 24h
  changePercent24h: number // đổi giá % 24h
  high24h: number
  low24h: number
  volume24h: number // volume theo coin
  quoteVolume24h: number // volume quy ra USDT
  marketCap: number
  rank: number | null // coinRank
}

/** CoinListResult — kết quả phân trang trả cho FE. */
export interface CoinListResult {
  items: Coin[]
  total: number // tổng số coin (để tính số trang)
  page: number
  limit: number
}

// ── REALTIME (FE overlay từ WebSocket Binance) ───────────────

/**
 * CoinTick — gói giá live phủ lên Coin (chỉ phía FE, nguồn WS Binance).
 * Không do server sinh; gom ở đây để mọi type về coin nằm 1 chỗ.
 */
export interface CoinTick {
  symbol: string
  price: number
  changePercent24h: number
  direction: 'up' | 'down' | 'neutral'
}
