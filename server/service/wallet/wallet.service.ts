// ─────────────────────────────────────────────────────────────
// WALLET SERVICE — Nguồn DUY NHẤT cho dữ liệu ví.
// NUMERIC từ PostgreSQL về dạng chuỗi → parse sang number đúng 1 lần ở mapper.
// ─────────────────────────────────────────────────────────────
import { createError } from 'h3'
import { execute, query, queryOne, withTransaction } from '../../utils/db'
import type { DbClient } from '../../utils/db'
import { dateRangeWhere } from '../../utils/sql'
import type {
  Holding, WalletOverview, ChartPeriod,
  WalletChartQuery, WalletChartPoint, WalletChartResult,
  WalletTransaction, WalletTransactionQuery,
  DepositRequest, DepositResult
} from '../../dtos/wallet'
import { DEFAULT_CHART_PERIOD } from '../../dtos/wallet'

const INITIAL_CASH_BALANCE = 10000 // user mới: 10,000 USDT ảo
const MAX_DEPOSIT = 1_000_000 // trần mỗi lần nạp (tiền ảo, chặn số vô lý)

interface WalletRow {
  id: number
  user_id: number
  cash_balance: string
  updated_at: string
}
interface HoldingRow {
  id: number
  coin_id: number
  amount: string
  avg_buy_price: string
  symbol: string
  name: string
  icon: string | null
  current_price: string
  market_cap: string
  volume_24h: string
}

function toHolding(r: HoldingRow): Holding {
  const amount = parseFloat(r.amount)
  const avgBuyPrice = parseFloat(r.avg_buy_price) || 0
  const currentPrice = parseFloat(r.current_price)
  return {
    id: r.id,
    coinId: r.coin_id,
    symbol: r.symbol,
    name: r.name,
    icon: r.icon,
    amount,
    avgBuyPrice,
    currentPrice,
    value: amount * currentPrice,
    pnl: amount * (currentPrice - avgBuyPrice),
    pnlPercent: avgBuyPrice > 0 ? ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0,
    marketCap: parseFloat(r.market_cap) || 0,
    volume24h: parseFloat(r.volume_24h) || 0
  }
}

/** total_value là bộ đệm = cash_balance + Σ coin × giá hiện tại. Gọi sau mọi thay đổi số dư/coin. */
export async function recalcWalletTotals(walletIds: number[], client?: DbClient): Promise<void> {
  if (!walletIds.length) return
  await execute(
    `UPDATE wallets w
        SET total_value = w.cash_balance + COALESCE((
              SELECT SUM(wh.amount * vc.current_price)
                FROM wallet_holdings wh
                JOIN virtual_coins vc ON vc.id = wh.coin_id
               WHERE wh.wallet_id = w.id), 0),
            updated_at = now()
      WHERE w.id = ANY($1::int[])`,
    [walletIds],
    client
  )
}

export class WalletService {
  /** Đảm bảo ví tồn tại (idempotent). Trả về walletId. */
  ensureWallet = async (userId: number, client?: DbClient): Promise<number> => {
    await execute(
      `INSERT INTO wallets (user_id, cash_balance, total_value) VALUES ($1, $2, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, INITIAL_CASH_BALANCE],
      client
    )
    const row = await queryOne<{ id: number }>('SELECT id FROM wallets WHERE user_id = $1', [userId], client)
    return row!.id
  }

  /** Tổng quan ví: tiền mặt + tổng giá trị coin theo giá hiện tại. */
  getOverview = async (userId: number): Promise<WalletOverview> => {
    await this.ensureWallet(userId)
    const wallet = (await queryOne<WalletRow>(
      'SELECT id, user_id, cash_balance, updated_at FROM wallets WHERE user_id = $1',
      [userId]
    ))!
    const agg = (await queryOne<{ coins_value: string, holdings_count: number }>(
      `SELECT COALESCE(SUM(wh.amount * vc.current_price), 0) AS coins_value,
              COUNT(*) AS holdings_count
         FROM wallet_holdings wh
         JOIN virtual_coins vc ON vc.id = wh.coin_id
        WHERE wh.wallet_id = $1 AND wh.amount > 0`,
      [wallet.id]
    ))!

    const cashBalance = parseFloat(wallet.cash_balance)
    const coinsValue = parseFloat(agg.coins_value)
    return {
      id: wallet.id,
      userId: wallet.user_id,
      cashBalance,
      coinsValue,
      totalValue: cashBalance + coinsValue,
      holdingsCount: agg.holdings_count,
      updatedAt: wallet.updated_at
    }
  }

  /** Coin đang giữ trong ví (amount > 0). */
  getHoldings = async (userId: number): Promise<Holding[]> => {
    const walletId = await this.ensureWallet(userId)
    const rows = await query<HoldingRow>(
      `SELECT wh.id, wh.coin_id, wh.amount, wh.avg_buy_price,
              vc.symbol, vc.name, vc.icon, vc.current_price, vc.market_cap, vc.volume_24h
         FROM wallet_holdings wh
         JOIN virtual_coins vc ON vc.id = wh.coin_id
        WHERE wh.wallet_id = $1 AND wh.amount > 0
        ORDER BY wh.updated_at DESC`,
      [walletId]
    )
    return rows.map(toHolding)
  }

  /**
   * Biểu đồ P&L theo kỳ (ngày/tuần/tháng).
   * pnl/kỳ = tiền bán − tiền mua (dòng tiền xấp xỉ); cumulativePnl = cộng dồn.
   */
  getChart = async (userId: number, q: WalletChartQuery = {}): Promise<WalletChartResult> => {
    const period: ChartPeriod = q.period ?? DEFAULT_CHART_PERIOD
    const unit = { daily: 'day', weekly: 'week', monthly: 'month' }[period]
    const bucket = `to_char(date_trunc('${unit}', created_at), 'YYYY-MM-DD')`

    const range = dateRangeWhere(q, 'created_at', 2)
    const where = ['user_id = $1', range.where].filter(Boolean).join(' AND ')
    const params = [userId, ...range.params]

    const [tradeRows, orderRows] = await Promise.all([
      query<{ date: string, buy_cost: string, sell_revenue: string }>(
        `SELECT ${bucket} AS date,
                COALESCE(SUM(total_cost) FILTER (WHERE side = 'BUY'), 0)  AS buy_cost,
                COALESCE(SUM(total_cost) FILTER (WHERE side = 'SELL'), 0) AS sell_revenue
           FROM trades WHERE ${where} GROUP BY 1`,
        params
      ),
      query<{ date: string, order_count: number }>(
        `SELECT ${bucket} AS date, COUNT(*) AS order_count FROM orders WHERE ${where} GROUP BY 1`,
        params
      )
    ])

    const byDate = new Map<string, { buyCost: number, sellRevenue: number, orderCount: number }>()
    for (const r of tradeRows) {
      byDate.set(r.date, { buyCost: parseFloat(r.buy_cost), sellRevenue: parseFloat(r.sell_revenue), orderCount: 0 })
    }
    for (const r of orderRows) {
      const cur = byDate.get(r.date) ?? { buyCost: 0, sellRevenue: 0, orderCount: 0 }
      cur.orderCount = r.order_count
      byDate.set(r.date, cur)
    }

    let cumulative = 0
    const points: WalletChartPoint[] = [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => {
        const pnl = v.sellRevenue - v.buyCost
        cumulative += pnl
        return { date, buyCost: v.buyCost, sellRevenue: v.sellRevenue, orderCount: v.orderCount, pnl, cumulativePnl: cumulative }
      })

    return {
      points,
      summary: {
        totalBuy: points.reduce((s, p) => s + p.buyCost, 0),
        totalSell: points.reduce((s, p) => s + p.sellRevenue, 0),
        totalOrders: points.reduce((s, p) => s + p.orderCount, 0),
        period
      }
    }
  }

  /** Lịch sử khớp lệnh gần đây (bảng trades). */
  getRecentTransactions = async (userId: number, q: WalletTransactionQuery = {}): Promise<WalletTransaction[]> => {
    const limit = Math.min(50, Math.max(1, Number(q.limit) || 20))
    const offset = Math.max(0, Number(q.offset) || 0)

    const rows = await query<{ id: number, symbol: string, side: 'BUY' | 'SELL', quantity: string, price: string, total_cost: string, created_at: Date }>(
      `SELECT id, symbol, side, quantity, price, total_cost, created_at
         FROM trades WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )

    return rows.map((t): WalletTransaction => {
      const created = new Date(t.created_at)
      const isBuy = t.side === 'BUY'
      return {
        id: t.id,
        type: isBuy ? 'buy' : 'sell',
        symbol: t.symbol.replace(/(USDT|BTC|ETH)$/, ''),
        amount: parseFloat(t.quantity),
        price: parseFloat(t.price),
        total: parseFloat(t.total_cost),
        note: isBuy ? `Mua ${t.symbol}` : `Bán ${t.symbol}`,
        time: created.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        date: created.toLocaleDateString('vi-VN'),
        status: 'completed'
      }
    })
  }

  /** Nạp tiền ảo vào ví — cộng số dư + ghi lịch sử nạp trong MỘT transaction. */
  deposit = async (userId: number, dto: DepositRequest): Promise<DepositResult> => {
    const amount = Number(dto.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_DEPOSIT) {
      throw createError({ statusCode: 400, statusMessage: `Số tiền nạp phải trong khoảng 0 – ${MAX_DEPOSIT.toLocaleString('en-US')} USDT` })
    }
    const currency = dto.currency ?? 'USDT'
    const paymentMethod = dto.paymentMethod ?? 'bank_transfer'

    return withTransaction(async (client) => {
      const walletId = await this.ensureWallet(userId, client)
      const before = (await queryOne<{ cash_balance: string }>(
        'SELECT cash_balance FROM wallets WHERE id = $1 FOR UPDATE',
        [walletId],
        client
      ))!
      const after = (await queryOne<{ cash_balance: string }>(
        'UPDATE wallets SET cash_balance = cash_balance + $1, updated_at = now() WHERE id = $2 RETURNING cash_balance',
        [amount.toFixed(8), walletId],
        client
      ))!
      await recalcWalletTotals([walletId], client)
      await execute(
        `INSERT INTO deposit_transactions (user_id, currency, amount, payment_method)
         VALUES ($1, $2, $3, $4)`,
        [userId, currency, amount.toFixed(8), paymentMethod],
        client
      )

      return {
        previousBalance: parseFloat(before.cash_balance),
        newBalance: parseFloat(after.cash_balance),
        amount,
        currency,
        method: paymentMethod,
        timestamp: new Date().toISOString()
      }
    })
  }
}

export const walletService = new WalletService()
