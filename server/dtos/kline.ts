// ─────────────────────────────────────────────────────────────
// KLINE DTO — Hợp đồng kiểu dữ liệu cho domain `kline` (nến).
// Dùng chung cho SERVER (service/api) lẫn CLIENT (composable/component).
// Import: import type { Candle } from '#dtos/kline'
// ─────────────────────────────────────────────────────────────

// ── QUERY (client → server) ──────────────────────────────────

/** Các khung thời gian Binance hỗ trợ. */
export type KlineInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M'

/** Allowlist interval — single source of truth cho validate ở server. */
export const KLINE_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'] as const
export const DEFAULT_KLINE_INTERVAL: KlineInterval = '1d'
export const DEFAULT_KLINE_LIMIT = 500
export const MAX_KLINE_LIMIT = 800

/** Validate giá trị query có phải interval hợp lệ không. */
export function isValidKlineInterval(v: unknown): v is KlineInterval {
  return typeof v === 'string' && (KLINE_INTERVALS as readonly string[]).includes(v)
}

/**
 * KlineQuery — tham số lấy nến.
 * @property symbol   - base symbol KHÔNG kèm USDT (vd 'BTC'); service tự append.
 * @property interval - khung thời gian
 * @property limit    - số nến (clamp 1..500)
 */
export interface KlineQuery {
  symbol: string
  interval?: KlineInterval
  limit?: number
}

// ── RESPONSE (server → client) ───────────────────────────────

/**
 * Candle — 1 cây nến, format ĐÃ KHỚP `lightweight-charts` schema.
 * FE truyền thẳng vào `series.setData(candles)` không cần map lại.
 */
export interface Candle {
  time: number // unix seconds (đã /1000)
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ── REALTIME (FE overlay từ WebSocket Binance) ───────────────

/**
 * KlineTick — gói nến đang chạy từ Binance WS, phủ lên Candle gần nhất.
 * Không do server sinh; gom ở đây để mọi type về kline nằm 1 chỗ.
 */
export interface KlineTick extends Candle {
  symbol: string // base, không kèm USDT
  interval: KlineInterval
  isFinal: boolean // true khi nến đã đóng (k.x từ Binance)
}
