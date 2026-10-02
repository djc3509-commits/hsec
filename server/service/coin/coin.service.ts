// ─────────────────────────────────────────────────────────────
// COIN SERVICE — Nguồn DUY NHẤT cho dữ liệu coin.
// NUMERIC từ PostgreSQL về dạng chuỗi → parse sang number đúng 1 lần ở toCoin().
// ─────────────────────────────────────────────────────────────
import type { Coin, CoinListQuery, CoinListResult, CoinSort } from '../../dtos/coin'
import { DEFAULT_COIN_SORT, DEFAULT_COIN_LIMIT } from '../../dtos/coin'
import { execute, query, queryOne } from '../../utils/db'

const COIN_COLUMNS = `
  id, symbol, name, icon, current_price,
  price_change_24h, price_change_percent_24h, high_24h, low_24h,
  volume_24h, quote_volume_24h, market_cap, coin_rank`

// Sort = allowlist cứng → ORDER BY (tên cột không tham số hoá được, bảng này chặn SQL injection).
const ORDER_BY: Record<CoinSort, string> = {
  rank: 'coin_rank ASC NULLS LAST, quote_volume_24h DESC',
  gainers: 'price_change_percent_24h DESC',
  losers: 'price_change_percent_24h ASC',
  volume: 'quote_volume_24h DESC'
}

interface CoinRow {
  id: number
  symbol: string
  name: string
  icon: string | null
  current_price: string
  price_change_24h: string
  price_change_percent_24h: string
  high_24h: string
  low_24h: string
  volume_24h: string
  quote_volume_24h: string
  market_cap: string
  coin_rank: number | null
}

interface TickerStats24h {
  symbol: string
  lastPrice: string
  priceChange: string
  priceChangePercent: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
}

function toCoin(r: CoinRow): Coin {
  return {
    id: r.id,
    symbol: r.symbol,
    name: r.name,
    icon: r.icon,
    price: parseFloat(r.current_price),
    change24h: parseFloat(r.price_change_24h),
    changePercent24h: parseFloat(r.price_change_percent_24h),
    high24h: parseFloat(r.high_24h),
    low24h: parseFloat(r.low_24h),
    volume24h: parseFloat(r.volume_24h),
    quoteVolume24h: parseFloat(r.quote_volume_24h),
    marketCap: parseFloat(r.market_cap),
    rank: r.coin_rank
  }
}

export class CoinService {
  // Chống chạy chồng syncPrices khi lần trước chưa xong.
  private isSyncing = false

  /** Danh sách coin đang hoạt động: phân trang + tìm kiếm + sắp xếp. */
  list = async (q: CoinListQuery = {}): Promise<CoinListResult> => {
    const page = Math.max(1, Number(q.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(q.limit) || DEFAULT_COIN_LIMIT))
    const offset = (page - 1) * limit
    const sort: CoinSort = q.sort ?? DEFAULT_COIN_SORT

    const conditions = ['is_active']
    const params: unknown[] = []
    const search = q.search?.trim()
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(symbol ILIKE $${params.length} OR name ILIKE $${params.length})`)
    }
    const where = `WHERE ${conditions.join(' AND ')}`

    const total = (await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM virtual_coins ${where}`, params))!.total
    const rows = await query<CoinRow>(
      `SELECT ${COIN_COLUMNS} FROM virtual_coins ${where}
        ORDER BY ${ORDER_BY[sort]}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )
    return { items: rows.map(toCoin), total, page, limit }
  }

  /** 1 coin theo symbol (vd 'BTC'); null nếu không có. */
  getBySymbol = async (symbol: string): Promise<Coin | null> => {
    const row = await queryOne<CoinRow>(`SELECT ${COIN_COLUMNS} FROM virtual_coins WHERE symbol = $1`, [symbol.toUpperCase()])
    return row ? toCoin(row) : null
  }

  /** Nhiều coin theo danh sách symbol. */
  getMany = async (symbols: string[]): Promise<Coin[]> => {
    if (!symbols.length) return []
    const rows = await query<CoinRow>(
      `SELECT ${COIN_COLUMNS} FROM virtual_coins WHERE symbol = ANY($1::text[])`,
      [symbols.map(s => s.toUpperCase())]
    )
    return rows.map(toCoin)
  }

  /**
   * Đồng bộ giá từ Binance cho mọi coin đang hoạt động (job 30s gọi).
   * Một câu UPDATE … FROM unnest(...) cho cả danh sách. KHÔNG đụng market_cap (do CoinGecko quản).
   */
  syncPrices = async (): Promise<void> => {
    if (this.isSyncing) return
    this.isSyncing = true
    try {
      const tickers = await $fetch<TickerStats24h[]>('https://api.binance.com/api/v3/ticker/24hr')
      if (!Array.isArray(tickers) || !tickers.length) return
      const byPair = new Map(tickers.map(t => [t.symbol, t]))

      const coins = await query<{ id: number, symbol: string }>('SELECT id, symbol FROM virtual_coins WHERE is_active')
      const cols: string[][] = [[], [], [], [], [], [], [], []]
      for (const c of coins) {
        const t = byPair.get(`${c.symbol}USDT`)
        if (!t) continue
        const values = [String(c.id), t.lastPrice, t.priceChange, t.priceChangePercent, t.highPrice, t.lowPrice, t.volume, t.quoteVolume]
        values.forEach((v, i) => cols[i]!.push(v))
      }
      if (!cols[0]!.length) return

      await execute(
        `UPDATE virtual_coins c SET
            current_price            = v.price,
            price_change_24h         = v.change,
            price_change_percent_24h = v.change_pct,
            high_24h                 = v.high,
            low_24h                  = v.low,
            volume_24h               = v.volume,
            quote_volume_24h         = v.quote_volume,
            updated_at               = now()
           FROM unnest($1::int[], $2::numeric[], $3::numeric[], $4::numeric[], $5::numeric[], $6::numeric[], $7::numeric[], $8::numeric[])
             AS v(id, price, change, change_pct, high, low, volume, quote_volume)
          WHERE c.id = v.id`,
        cols
      )
    } catch (err) {
      console.error('[coin.syncPrices] error:', err)
    } finally {
      this.isSyncing = false
    }
  }

  /** Bảng coin còn trống (database mới tạo) → nạp danh mục từ CoinGecko. */
  ensureSeeded = async (): Promise<void> => {
    const row = await queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM virtual_coins')
    if (row && row.total > 0) return
    const result = await this.seedFromCoinGecko()
    console.info(`[coin.seed] đã nạp ${result.upserted}/${result.fetched} coin từ CoinGecko`)
  }

  /**
   * Nạp top-N coin theo vốn hoá từ CoinGecko, chỉ giữ coin có cặp USDT đang giao dịch trên Binance.
   * UPSERT theo symbol → giữ nguyên id cũ (orders / wallet_holdings vẫn trỏ đúng).
   */
  seedFromCoinGecko = async (count = 100): Promise<{ fetched: number, upserted: number, skipped: number }> => {
    const exInfo = await $fetch<{ symbols: { status: string, baseAsset: string, quoteAsset: string }[] }>(
      'https://api.binance.com/api/v3/exchangeInfo'
    )
    const usdtBases = new Set(
      exInfo.symbols.filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING').map(s => s.baseAsset)
    )

    const cg = await $fetch<Array<{
      symbol: string
      name: string
      image: string
      current_price: number | null
      market_cap: number | null
      total_volume: number | null
      market_cap_rank: number | null
    }>>('https://api.coingecko.com/api/v3/coins/markets', {
      query: { vs_currency: 'usd', per_page: count, page: 1, order: 'market_cap_desc' }
    })

    const usable = cg.filter(c => usdtBases.has(c.symbol.toUpperCase()))
    if (!usable.length) return { fetched: cg.length, upserted: 0, skipped: cg.length }

    await execute(
      `INSERT INTO virtual_coins (symbol, name, icon, current_price, market_cap, volume_24h, coin_rank, is_active)
       SELECT v.symbol, v.name, v.icon, v.price, v.market_cap, v.volume, v.rank, true
         FROM unnest($1::text[], $2::text[], $3::text[], $4::numeric[], $5::numeric[], $6::numeric[], $7::int[])
           AS v(symbol, name, icon, price, market_cap, volume, rank)
       ON CONFLICT (symbol) DO UPDATE SET
         name       = EXCLUDED.name,
         icon       = EXCLUDED.icon,
         market_cap = EXCLUDED.market_cap,
         coin_rank  = EXCLUDED.coin_rank,
         is_active  = true,
         updated_at = now()`,
      [
        usable.map(c => c.symbol.toUpperCase()),
        usable.map(c => c.name),
        usable.map(c => c.image),
        usable.map(c => c.current_price ?? 0),
        usable.map(c => c.market_cap ?? 0),
        usable.map(c => c.total_volume ?? 0),
        usable.map(c => c.market_cap_rank)
      ]
    )

    return { fetched: cg.length, upserted: usable.length, skipped: cg.length - usable.length }
  }
}

export const coinService = new CoinService()
