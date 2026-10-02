// ─────────────────────────────────────────────────────────────
// ANALYST HISTORY SERVICE — Lịch sử đề xuất AI đã lưu (ai_recommendations).
// Dùng cho các route /api/analyst/history* và plugin analystTracker (tự đóng đề xuất chạm TP/SL/hết hạn).
// ─────────────────────────────────────────────────────────────
import { createError } from 'h3'
import { execute, query, queryOne } from '../../utils/db'
import { coinService } from '../coin/coin.service'
import type { RecHistoryRow, HistoryResult, HistoryStats, RecDetail, Direction } from '../../dtos/analyst'

// Thời hạn tối đa của 1 đề xuất theo khung giao dịch (ngày).
const HORIZON_DAYS: Record<string, number> = { scalp: 1, day: 3, swing: 14, position: 90 }

type ClosedStatus = 'HIT_TP' | 'HIT_SL' | 'EXPIRED'

const num = (v: unknown): number => (v == null ? 0 : parseFloat(String(v)))
const numOrNull = (v: unknown): number | null => (v == null ? null : parseFloat(String(v)))

/** pnl đã gồm đòn bẩy (position_size đã nhân leverage lúc lập kế hoạch). */
function calcPnl(direction: Direction, entry: number, exit: number, size: number): number {
  return direction === 'UP' ? (exit - entry) * size : (entry - exit) * size
}

export class AnalystHistoryService {
  list = async (userId: number, page: number, limit: number): Promise<HistoryResult> => {
    const offset = (page - 1) * limit
    const [rows, statRow] = await Promise.all([
      query(
        `SELECT id, symbol, horizon, amount, direction, confidence,
                entry_price, stop_loss, take_profit, status, pnl, exit_price, created_at, closed_at
           FROM ai_recommendations
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      queryOne<{ total: number, wins: number, losses: number, open_count: number, expired: number, total_pnl: string, best_trade: string, worst_trade: string }>(
        `SELECT COUNT(*)                                    AS total,
                COUNT(*) FILTER (WHERE status = 'HIT_TP')   AS wins,
                COUNT(*) FILTER (WHERE status = 'HIT_SL')   AS losses,
                COUNT(*) FILTER (WHERE status = 'OPEN')     AS open_count,
                COUNT(*) FILTER (WHERE status = 'EXPIRED')  AS expired,
                COALESCE(SUM(pnl), 0)                       AS total_pnl,
                COALESCE(MAX(pnl), 0)                       AS best_trade,
                COALESCE(MIN(pnl), 0)                       AS worst_trade
           FROM ai_recommendations
          WHERE user_id = $1`,
        [userId]
      )
    ])

    const s = statRow!
    const closed = s.wins + s.losses
    const stats: HistoryStats = {
      total: s.total,
      wins: s.wins,
      losses: s.losses,
      open: s.open_count,
      expired: s.expired,
      winRate: closed > 0 ? Math.round((s.wins / closed) * 100) : 0,
      totalPnl: num(s.total_pnl),
      bestTrade: num(s.best_trade),
      worstTrade: num(s.worst_trade)
    }

    const items: RecHistoryRow[] = rows.map(r => ({
      id: r.id,
      symbol: r.symbol,
      horizon: r.horizon,
      amount: num(r.amount),
      direction: r.direction,
      confidence: r.confidence,
      entryPrice: num(r.entry_price),
      stopLoss: num(r.stop_loss),
      takeProfit: num(r.take_profit),
      status: r.status,
      pnl: num(r.pnl),
      exitPrice: numOrNull(r.exit_price),
      createdAt: r.created_at,
      closedAt: r.closed_at
    }))

    return { items, page, limit, total: s.total, stats }
  }

  getDetail = async (userId: number, id: number): Promise<RecDetail> => {
    const r = await queryOne(
      `SELECT * FROM ai_recommendations WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    if (!r) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy đề xuất' })

    return {
      id: r.id,
      symbol: r.symbol,
      amount: num(r.amount),
      horizon: r.horizon,
      risk: r.risk,
      experience: r.experience,
      goal: r.goal,
      style: r.style,
      maxRiskPct: num(r.max_risk_pct),
      reportDepth: r.report_depth,
      tone: r.tone ?? null,
      stopLossKind: r.stop_loss_kind ?? null,
      profitTargetPct: numOrNull(r.profit_target_pct),
      marketBias: r.market_bias ?? null,
      entryStrategy: r.entry_strategy ?? null,
      direction: r.direction,
      confidence: r.confidence,
      entryPrice: num(r.entry_price),
      stopLoss: num(r.stop_loss),
      takeProfit: num(r.take_profit),
      positionSize: num(r.position_size),
      leverage: r.leverage ?? 1,
      liquidationPrice: numOrNull(r.liquidation_price),
      aiNarrative: r.ai_narrative ?? '',
      aiReasons: Array.isArray(r.ai_reasons) ? r.ai_reasons : [],
      aiKeyPoints: Array.isArray(r.ai_key_points) ? r.ai_key_points : [],
      status: r.status,
      pnl: num(r.pnl),
      exitPrice: numOrNull(r.exit_price),
      closedAt: r.closed_at,
      model: r.model ?? '',
      elapsedMs: r.elapsed_ms ?? 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  }

  /** Đóng tay 1 đề xuất đang OPEN tại giá hiện tại: lãi → HIT_TP, lỗ → HIT_SL. */
  closeManually = async (userId: number, id: number) => {
    const rec = await queryOne<{ symbol: string, direction: Direction, entry_price: string, position_size: string, status: string }>(
      'SELECT symbol, direction, entry_price, position_size, status FROM ai_recommendations WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    if (!rec) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy đề xuất' })
    if (rec.status !== 'OPEN') throw createError({ statusCode: 409, statusMessage: 'Lệnh đã đóng trước đó' })

    const coin = await coinService.getBySymbol(rec.symbol)
    if (!coin?.price) throw createError({ statusCode: 502, statusMessage: 'Chưa lấy được giá hiện tại' })

    const pnl = calcPnl(rec.direction, num(rec.entry_price), coin.price, num(rec.position_size))
    const status: ClosedStatus = pnl >= 0 ? 'HIT_TP' : 'HIT_SL'
    const updated = await this.close(id, status, coin.price, pnl, userId)
    if (!updated) throw createError({ statusCode: 409, statusMessage: 'Lệnh đã đóng trước đó' })

    return { id, status, exitPrice: coin.price, pnl: Math.round(pnl * 100) / 100 }
  }

  deleteOne = async (userId: number, id: number): Promise<{ deleted: number }> => ({
    deleted: await execute('DELETE FROM ai_recommendations WHERE id = $1 AND user_id = $2', [id, userId])
  })

  deleteAll = async (userId: number): Promise<{ deleted: number }> => ({
    deleted: await execute('DELETE FROM ai_recommendations WHERE user_id = $1', [userId])
  })

  /** Quét mọi đề xuất OPEN: chạm TP / SL hoặc quá hạn → đóng và ghi pnl. Plugin gọi mỗi 30s. */
  scanOpen = async (): Promise<void> => {
    const rows = await query<{ id: number, symbol: string, horizon: string, direction: Direction, entry_price: string, stop_loss: string, take_profit: string, position_size: string, created_at: Date }>(
      `SELECT id, symbol, horizon, direction, entry_price, stop_loss, take_profit, position_size, created_at
         FROM ai_recommendations WHERE status = 'OPEN'`
    )
    if (!rows.length) return

    const coins = await coinService.getMany([...new Set(rows.map(r => r.symbol))])
    const priceOf = new Map(coins.map(c => [c.symbol, c.price]))

    for (const rec of rows) {
      const cur = priceOf.get(rec.symbol)
      if (!cur) continue
      const tp = num(rec.take_profit)
      const sl = num(rec.stop_loss)

      let status: ClosedStatus | null = null
      let exit = cur
      const up = rec.direction === 'UP'
      if (up ? cur >= tp : cur <= tp) {
        status = 'HIT_TP'
        exit = tp
      } else if (up ? cur <= sl : cur >= sl) {
        status = 'HIT_SL'
        exit = sl
      }
      if (!status) {
        const ageMs = Date.now() - new Date(rec.created_at).getTime()
        if (ageMs > (HORIZON_DAYS[rec.horizon] ?? 14) * 86_400_000) status = 'EXPIRED'
      }
      if (!status) continue

      try {
        await this.close(rec.id, status, exit, calcPnl(rec.direction, num(rec.entry_price), exit, num(rec.position_size)))
      } catch (err) {
        console.warn(`[analyst-tracker] #${rec.id} failed:`, (err as Error).message)
      }
    }
  }

  /** Chỉ đóng khi vẫn đang OPEN (chống đóng 2 lần khi tracker và user bấm cùng lúc). */
  private close = async (id: number, status: ClosedStatus, exit: number, pnl: number, userId?: number): Promise<number> => {
    return execute(
      `UPDATE ai_recommendations
          SET status = $1, exit_price = $2, pnl = $3, closed_at = now(), updated_at = now()
        WHERE id = $4 AND status = 'OPEN' ${userId ? 'AND user_id = $5' : ''}`,
      userId ? [status, exit, pnl, id, userId] : [status, exit, pnl, id]
    )
  }
}

export const analystHistoryService = new AnalystHistoryService()
