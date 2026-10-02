// ─────────────────────────────────────────────────────────────
// ORDER SERVICE — Đặt lệnh (giữ tiền / khoá coin + khớp lệnh trong MỘT transaction), huỷ lệnh, đọc lệnh.
// Validate request đã làm ở handler (zod) → service tin DTO sạch.
// ─────────────────────────────────────────────────────────────
import { createError } from 'h3'
import { execute, query, queryOne, withTransaction } from '../../utils/db'
import type { DbClient } from '../../utils/db'
import { dateRangeWhere } from '../../utils/sql'
import { recalcWalletTotals } from '../wallet/wallet.service'
import { baseAsset, dec, getFeeRates, matchOrder, round8, settleOrders } from './matching.service'
import type {
  Order, OrderDetail, OrderTrade, OrderCreated,
  OrderListQuery, OrderListResult,
  OrderBookLevel, OrderBookResult,
  FeeConfig, CancelOrderResult,
  CreateOrderRequest, OrderSide, OrderStatus, OrderType,
  OrderStatsResponse, RecentTrade
} from '../../dtos/order'

interface OrderRow {
  id: number
  user_id: number
  symbol: string
  side: OrderSide
  type: OrderType
  price: string
  quantity: string
  executed_quantity: string
  reserved_cash: string
  status: OrderStatus
  created_at: string
  updated_at: string
}

const ORDER_COLUMNS = 'id, user_id, symbol, side, type, price, quantity, executed_quantity, reserved_cash, status, created_at, updated_at'

function toOrder(r: OrderRow): Order {
  return {
    id: r.id,
    symbol: r.symbol,
    side: r.side,
    type: r.type,
    price: parseFloat(r.price),
    quantity: parseFloat(r.quantity),
    executedQuantity: parseFloat(r.executed_quantity),
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

/** Trả phần chưa khớp của lệnh về ví: BUY → tiền đang giữ, SELL → coin đang khoá. */
async function releaseRemainder(client: DbClient, order: OrderRow, coinId: number | null): Promise<{ walletId: number | null, refunded: number }> {
  const remainingQty = round8(parseFloat(order.quantity) - parseFloat(order.executed_quantity))

  if (order.side === 'BUY') {
    const reserved = parseFloat(order.reserved_cash)
    await execute('UPDATE orders SET reserved_cash = 0 WHERE id = $1', [order.id], client)
    if (reserved <= 0) return { walletId: null, refunded: 0 }
    const w = await queryOne<{ id: number }>(
      'UPDATE wallets SET cash_balance = cash_balance + $1, updated_at = now() WHERE user_id = $2 RETURNING id',
      [order.reserved_cash, order.user_id],
      client
    )
    return { walletId: w?.id ?? null, refunded: reserved }
  }

  if (remainingQty <= 0 || !coinId) return { walletId: null, refunded: 0 }
  const w = await queryOne<{ id: number }>(
    `UPDATE wallet_holdings wh SET amount = amount + $1, updated_at = now()
       FROM wallets w
      WHERE w.id = wh.wallet_id AND w.user_id = $2 AND wh.coin_id = $3
      RETURNING w.id`,
    [dec(remainingQty), order.user_id, coinId],
    client
  )
  return { walletId: w?.id ?? null, refunded: remainingQty }
}

export class OrderService {
  create = async (userId: number, dto: CreateOrderRequest): Promise<OrderCreated> => {
    const quantity = round8(dto.quantity)
    if (quantity <= 0) throw createError({ statusCode: 400, statusMessage: 'Số lượng quá nhỏ' })

    return withTransaction(async (client) => {
      const coin = await queryOne<{ id: number }>(
        'SELECT id FROM virtual_coins WHERE symbol = $1 AND is_active',
        [baseAsset(dto.symbol)],
        client
      )
      if (!coin) throw createError({ statusCode: 400, statusMessage: `Không giao dịch được cặp ${dto.symbol}` })

      const wallet = await queryOne<{ id: number, cash_balance: string }>(
        'SELECT id, cash_balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [userId],
        client
      )
      if (!wallet) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy ví' })

      // Giá: LIMIT theo người đặt; MARKET lấy giá tốt nhất phía đối ứng (lệnh của người khác).
      let price = round8(dto.price ?? 0)
      if (dto.type === 'MARKET') {
        const best = await queryOne<{ price: string }>(
          `SELECT ob.price FROM order_book ob JOIN orders o ON o.id = ob.order_id
            WHERE ob.symbol = $1 AND ob.side = $2 AND ob.remaining_quantity > 0 AND o.user_id <> $3
            ORDER BY ob.price ${dto.side === 'BUY' ? 'ASC' : 'DESC'} LIMIT 1`,
          [dto.symbol, dto.side === 'BUY' ? 'SELL' : 'BUY', userId],
          client
        )
        if (!best) throw createError({ statusCode: 400, statusMessage: 'Không có thanh khoản cho lệnh MARKET' })
        price = parseFloat(best.price)
      }
      if (price <= 0) throw createError({ statusCode: 400, statusMessage: 'Giá không hợp lệ' })

      // Giữ tiền theo mức phí CAO NHẤT (lệnh có thể khớp ở vai taker); khớp xong hoàn phần dư.
      const fees = await getFeeRates(dto.symbol, client)
      const reserveRate = Math.max(fees.maker, fees.taker)
      const tradingAmount = round8(quantity * price)
      const feeAmount = round8(tradingAmount * reserveRate)
      const totalRequired = round8(tradingAmount + feeAmount)

      if (dto.side === 'BUY') {
        if (parseFloat(wallet.cash_balance) < totalRequired) {
          throw createError({
            statusCode: 400,
            statusMessage: `Số dư không đủ. Cần ${totalRequired.toFixed(2)} USDT, có ${parseFloat(wallet.cash_balance).toFixed(2)} USDT`
          })
        }
        await execute('UPDATE wallets SET cash_balance = cash_balance - $1, updated_at = now() WHERE id = $2', [dec(totalRequired), wallet.id], client)
      } else {
        const locked = await execute(
          `UPDATE wallet_holdings SET amount = amount - $1, updated_at = now()
            WHERE wallet_id = $2 AND coin_id = $3 AND amount >= $1`,
          [dec(quantity), wallet.id, coin.id],
          client
        )
        if (!locked) {
          const holding = await queryOne<{ amount: string }>('SELECT amount FROM wallet_holdings WHERE wallet_id = $1 AND coin_id = $2', [wallet.id, coin.id], client)
          throw createError({ statusCode: 400, statusMessage: `Số coin không đủ. Cần ${quantity}, có ${parseFloat(holding?.amount ?? '0')}` })
        }
      }

      const order = (await queryOne<{ id: number }>(
        `INSERT INTO orders (user_id, symbol, side, type, price, quantity, reserved_cash, reserve_fee_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [userId, dto.symbol, dto.side, dto.type, dec(price), dec(quantity), dto.side === 'BUY' ? dec(totalRequired) : '0', reserveRate],
        client
      ))!
      await execute(
        'INSERT INTO order_book (order_id, symbol, side, price, remaining_quantity) VALUES ($1, $2, $3, $4, $5)',
        [order.id, dto.symbol, dto.side, dec(price), dec(quantity)],
        client
      )

      const matched = await matchOrder(client, order.id, dto.symbol, coin.id)
      const walletIds = new Set<number>([wallet.id, ...matched.walletIds])
      ;(await settleOrders(client, matched.orderIds)).forEach(id => walletIds.add(id))

      // MARKET không nằm chờ trong sổ: phần chưa khớp được huỷ và hoàn lại ngay.
      let current = (await queryOne<OrderRow>(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1`, [order.id], client))!
      if (dto.type === 'MARKET' && current.status !== 'FILLED') {
        await execute('DELETE FROM order_book WHERE order_id = $1', [order.id], client)
        const released = await releaseRemainder(client, current, coin.id)
        if (released.walletId) walletIds.add(released.walletId)
        current = (await queryOne<OrderRow>(
          `UPDATE orders SET status = 'CANCELED', updated_at = now() WHERE id = $1 RETURNING ${ORDER_COLUMNS}`,
          [order.id],
          client
        ))!
      }

      await recalcWalletTotals([...walletIds], client)

      return {
        id: order.id,
        userId,
        symbol: dto.symbol,
        side: dto.side,
        type: dto.type,
        price,
        quantity,
        tradingAmount,
        feeRate: reserveRate,
        feeAmount,
        totalRequired,
        executedQuantity: parseFloat(current.executed_quantity),
        status: current.status
      }
    })
  }

  list = async (userId: number, q: OrderListQuery): Promise<OrderListResult> => {
    const page = q.page ?? 1
    const limit = q.limit ?? 20
    const conditions = ['user_id = $1']
    const params: unknown[] = [userId]
    if (q.status) {
      params.push(q.status)
      conditions.push(`status = $${params.length}`)
    }
    if (q.symbol) {
      params.push(q.symbol)
      conditions.push(`symbol = $${params.length}`)
    }
    const range = dateRangeWhere(q, 'created_at', params.length + 1)
    if (range.where) {
      conditions.push(range.where)
      params.push(...range.params)
    }
    const where = conditions.join(' AND ')

    const [rows, count] = await Promise.all([
      query<OrderRow>(
        `SELECT ${ORDER_COLUMNS} FROM orders WHERE ${where}
          ORDER BY created_at DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, (page - 1) * limit]
      ),
      queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM orders WHERE ${where}`, params)
    ])
    const total = count?.total ?? 0
    return {
      orders: rows.map(toOrder),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
    }
  }

  /** Chi tiết 1 lệnh + các lần khớp CỦA CHÍNH lệnh này (không lấy dòng trade của đối tác). */
  getById = async (userId: number, id: number): Promise<OrderDetail> => {
    const row = await queryOne<OrderRow>(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1 AND user_id = $2`, [id, userId])
    if (!row) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy lệnh' })
    const order = toOrder(row)

    const tradeRows = await query<{ id: number, side: OrderSide, role: 'MAKER' | 'TAKER', quantity: string, price: string, total_cost: string, fee: string, created_at: string }>(
      `SELECT t.id, t.side, t.role, t.quantity, t.price, t.total_cost, t.fee, t.created_at
         FROM trades t
         JOIN matches m ON m.id = t.match_id
        WHERE (m.buy_order_id = $1 AND t.side = 'BUY')
           OR (m.sell_order_id = $1 AND t.side = 'SELL')
        ORDER BY t.created_at ASC, t.id ASC`,
      [id]
    )
    const trades: OrderTrade[] = tradeRows.map(t => ({
      id: t.id,
      side: t.side,
      role: t.role,
      quantity: parseFloat(t.quantity),
      price: parseFloat(t.price),
      totalCost: parseFloat(t.total_cost),
      feeAmount: parseFloat(t.fee),
      createdAt: t.created_at
    }))

    const last = trades.at(-1) ?? null
    return {
      ...order,
      remainingQuantity: round8(order.quantity - order.executedQuantity),
      trades,
      lastMatchedAt: last?.createdAt ?? null,
      lastRole: last?.role ?? null,
      totalFilledValue: round8(trades.reduce((s, t) => s + t.totalCost, 0)),
      totalFeeUsdt: round8(trades.reduce((s, t) => s + t.feeAmount, 0)),
      totalReceivedQty: order.side === 'BUY' ? round8(trades.reduce((s, t) => s + t.quantity, 0)) : 0
    }
  }

  getBook = async (symbol: string, depth: number): Promise<OrderBookResult> => {
    const levels = (side: OrderSide) => query<{ price: string, quantity: string }>(
      `SELECT price, SUM(remaining_quantity) AS quantity
         FROM order_book
        WHERE symbol = $1 AND side = $2 AND remaining_quantity > 0
        GROUP BY price
        ORDER BY price ${side === 'SELL' ? 'ASC' : 'DESC'}
        LIMIT $3`,
      [symbol, side, depth]
    )
    const [askRows, bidRows] = await Promise.all([levels('SELL'), levels('BUY')])

    const build = (rows: { price: string, quantity: string }[]): OrderBookLevel[] => {
      let cum = 0
      return rows.map((r) => {
        const quantity = parseFloat(r.quantity)
        cum += quantity
        return { price: parseFloat(r.price), quantity, total: parseFloat(cum.toFixed(4)) }
      })
    }
    const asks = build(askRows)
    const bids = build(bidRows)
    const bestAsk = asks[0]?.price ?? 0
    const bestBid = bids[0]?.price ?? 0
    const spread = parseFloat((bestAsk - bestBid).toFixed(4))
    return {
      symbol,
      bids,
      asks,
      spread,
      spreadPct: bestBid > 0 ? parseFloat(((spread / bestBid) * 100).toFixed(4)) : 0,
      bestBid,
      bestAsk,
      updatedAt: new Date().toISOString()
    }
  }

  getFeeConfig = async (symbol = '*'): Promise<FeeConfig> => getFeeRates(symbol)

  /** Huỷ lệnh đang chờ: gỡ khỏi sổ, hoàn tiền giữ (BUY) hoặc coin khoá (SELL) của phần chưa khớp. */
  cancel = async (userId: number, id: number): Promise<CancelOrderResult> => {
    return withTransaction(async (client) => {
      const order = await queryOne<OrderRow>(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE`, [id, userId], client)
      if (!order) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy lệnh' })
      if (!['PENDING', 'PARTIALLY_FILLED'].includes(order.status)) {
        throw createError({ statusCode: 409, statusMessage: `Không thể huỷ lệnh ở trạng thái ${order.status}` })
      }

      await execute('DELETE FROM order_book WHERE order_id = $1', [id], client)
      await execute(`UPDATE orders SET status = 'CANCELED', updated_at = now() WHERE id = $1`, [id], client)

      const coin = await queryOne<{ id: number }>('SELECT id FROM virtual_coins WHERE symbol = $1', [baseAsset(order.symbol)], client)
      const released = await releaseRemainder(client, order, coin?.id ?? null)
      if (released.walletId) await recalcWalletTotals([released.walletId], client)

      return { id, status: 'CANCELED', refunded: released.refunded }
    })
  }

  /** Các lần khớp gần nhất của 1 cặp (bảng giao dịch công khai); side = phía chủ động (taker). */
  getRecentTrades = async (symbol: string, limit: number): Promise<RecentTrade[]> => {
    const rows = await query<{ side: OrderSide, price: string, quantity: string, created_at: Date }>(
      `SELECT side, price, quantity, created_at
         FROM trades
        WHERE symbol = $1 AND role = 'TAKER'
        ORDER BY created_at DESC, id DESC
        LIMIT $2`,
      [symbol, limit]
    )
    return rows.map(r => ({
      p: parseFloat(r.price).toFixed(2),
      q: parseFloat(r.quantity).toFixed(6),
      time: formatTradeTime(r.created_at),
      side: r.side === 'BUY' ? 'buy' : 'sell'
    }))
  }

  /** Đếm lệnh theo trạng thái của 1 user (thanh trạng thái trang lệnh). */
  getStats = async (userId: number, opts: { from?: string, to?: string } = {}): Promise<OrderStatsResponse> => {
    const range = dateRangeWhere(opts, 'created_at', 2)
    return this.countByStatus(['user_id = $1', range.where].filter(Boolean).join(' AND '), [userId, ...range.params])
  }

  /** Đếm lệnh theo trạng thái toàn hệ thống (Home dashboard). */
  getSystemStats = async (opts: { from?: string, to?: string } = {}): Promise<OrderStatsResponse> => {
    const range = dateRangeWhere(opts)
    return this.countByStatus(range.where, range.params)
  }

  private countByStatus = async (where: string, params: unknown[]): Promise<OrderStatsResponse> => {
    const row = await queryOne<OrderStatsResponse>(
      `SELECT COUNT(*) FILTER (WHERE status IN ('PENDING', 'PARTIALLY_FILLED')) AS pending,
              COUNT(*) FILTER (WHERE status = 'FILLED')                          AS filled,
              COUNT(*) FILTER (WHERE status = 'CANCELED')                        AS canceled
         FROM orders ${where ? `WHERE ${where}` : ''}`,
      params
    )
    return row ?? { pending: 0, filled: 0, canceled: 0 }
  }
}

export const orderService = new OrderService()

function formatTradeTime(input: Date | string): string {
  const d = new Date(input)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
