// ─────────────────────────────────────────────────────────────
// KLINE SERVICE — Nguồn DUY NHẤT cho nến (kline) từ Binance.
// - Cache theo (pair:interval:limit), TTL khác nhau theo timeframe.
// - Dedupe inflight: 3 chart cùng load 1 lúc → 1 request thật.
// - Map raw Binance → Candle DTO đã khớp lightweight-charts (FE dùng thẳng).
// Singleton: import { klineService } from '../../service/kline/kline.service'
// ─────────────────────────────────────────────────────────────
import type { Candle, KlineInterval, KlineQuery } from '../../dtos/kline'
import { DEFAULT_KLINE_INTERVAL, DEFAULT_KLINE_LIMIT, MAX_KLINE_LIMIT } from '../../dtos/kline'

// Raw kline tuple từ Binance:
// [openTime, open, high, low, close, volume, closeTime, quoteVolume,
//  trades, takerBuyBase, takerBuyQuote, ignore]
type BinanceKline = [
  number, string, string, string, string, string,
  number, string, number, string, string, string
]

// Cache TTL theo interval — interval ngắn cần fresh hơn
const TTL_BY_INTERVAL: Record<KlineInterval, number> = {
  '1m': 5_000,
  '5m': 10_000,
  '15m': 15_000,
  '1h': 30_000,
  '4h': 60_000,
  '1d': 120_000,
  '1w': 300_000,
  '1M': 600_000
}

export class KlineService {
  private cache = new Map<string, { data: Candle[], ts: number }>()
  private inflight = new Map<string, Promise<Candle[]>>()

  /**
   * Lấy danh sách nến lịch sử.
   * - Cache hit trong TTL → trả ngay.
   * - Cache miss + đang có request trùng key → chờ ké (dedupe).
   * - Cache miss + chưa có request → gọi Binance REST.
   */
  fetchCandles = async (q: KlineQuery): Promise<Candle[]> => {
    const symbol = q.symbol.toUpperCase().replace(/USDT$/, '')
    const interval = q.interval ?? DEFAULT_KLINE_INTERVAL
    const limit = Math.min(MAX_KLINE_LIMIT, Math.max(1, q.limit ?? DEFAULT_KLINE_LIMIT))
    const pair = `${symbol}USDT`
    const key = `${pair}:${interval}:${limit}`

    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.ts < TTL_BY_INTERVAL[interval]) {
      return cached.data
    }

    const inflight = this.inflight.get(key)
    if (inflight) return inflight

    const promise = this.loadFromBinance(pair, interval, limit)
      .then((candles) => {
        this.cache.set(key, { data: candles, ts: Date.now() })
        return candles
      })
      .finally(() => {
        this.inflight.delete(key)
      })

    this.inflight.set(key, promise)
    return promise
  }

  /** Gọi Binance REST + map raw → Candle DTO. */
  private loadFromBinance = async (
    pair: string,
    interval: KlineInterval,
    limit: number
  ): Promise<Candle[]> => {
    let raw: BinanceKline[]
    try {
      raw = await $fetch<BinanceKline[]>('https://api.binance.com/api/v3/klines', {
        query: { symbol: pair, interval, limit }
      })
    } catch (err) {
      console.error('[kline] Binance REST error:', err)
      throw createError({ statusCode: 502, statusMessage: 'Không lấy được dữ liệu nến từ Binance' })
    }

    // +str nhanh hơn parseFloat ~2-3x; time chia 1000 cho lightweight-charts (sec)
    return raw.map((k): Candle => ({
      time: Math.floor(k[0] / 1000),
      open: +k[1],
      high: +k[2],
      low: +k[3],
      close: +k[4],
      volume: +k[5]
    }))
  }
}

export const klineService = new KlineService()
