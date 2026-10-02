// ─────────────────────────────────────────────────────────────
// MATCHING SERVICE — Khớp 1 lệnh vừa đặt với sổ lệnh, TRONG CÙNG transaction của lệnh đó.
//
// Quy ước tiền:
//   • Lệnh BUY giữ tiền lúc đặt: reserved_cash = qty × giá đặt × (1 + reserve_fee_rate).
//     Mỗi lần khớp nhả phần tương ứng; chênh lệch (khớp rẻ hơn giá đặt, phí maker thấp hơn) HOÀN về ví.
//   • Lệnh SELL khoá coin lúc đặt; khi khớp người bán nhận tiền − phí THEO ĐÚNG VAI (maker/taker).
//   • Lệnh vừa đặt luôn là TAKER, lệnh có sẵn trong sổ là MAKER.
//   • Không khớp với lệnh của chính mình (self-trade).
// Số lượng/giá là NUMERIC(30,8): mọi phép trừ remaining/executed làm trong SQL nên về 0 chính xác.
// ─────────────────────────────────────────────────────────────

import { execute, query, queryOne } from '../../utils/db'
import type { DbClient } from '../../utils/db'
import { DEFAULT_MAKER_FEE, DEFAULT_TAKER_FEE } from '../../dtos/order'
import type { FeeConfig, OrderSide } from '../../dtos/order'

const MAX_COUNTERS_PER_MATCH = 50

/** Làm tròn 8 chữ số thập phân (độ chính xác của cột NUMERIC(30,8)). */
export function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8
}
export const dec = (n: number) => round8(n).toFixed(8)

/** Phí maker/taker hiệu lực cho 1 cặp: cấu hình riêng của cặp thắng cấu hình '*'. */
export async function getFeeRates(symbol: string, client?: DbClient): Promise<FeeConfig> {
  const rows = await query<{ fee_type: 'MAKER' | 'TAKER', fee_rate: string }>(
    `SELECT DISTINCT ON (fee_type) fee_type, fee_rate
       FROM trading_fee_config
      WHERE enabled AND symbol_pattern IN ($1, '*')
      ORDER BY fee_type, (symbol_pattern = '*'), updated_at DESC`,
    [symbol],
    client
  )
  const rate = (type: 'MAKER' | 'TAKER', fallback: number) => {
    const row = rows.find(r => r.fee_type === type)
    return row ? parseFloat(row.fee_rate) : fallback
  }
  return { maker: rate('MAKER', DEFAULT_MAKER_FEE), taker: rate('TAKER', DEFAULT_TAKER_FEE) }
}

/** 'BTCUSDT' → 'BTC'. */
export function baseAsset(symbol: string): string {
  return symbol.replace(/USDT$/, '')
}

interface BookEntry {
  order_id: number
  user_id: number
  side: OrderSide
  price: string
  remaining_quantity: string
  reserve_fee_rate: string
}

interface MatchContext {
  client: DbClient
  symbol: string
  coinId: number
  fees: FeeConfig
}

const BOOK_ENTRY_COLUMNS = 'ob.order_id, o.user_id, ob.side, ob.price, ob.remaining_quantity, o.reserve_fee_rate'

/**
 * Khớp lệnh `orderId` (đã nằm trong order_book) với các lệnh đối ứng tốt nhất.
 * Trả về id các lệnh + ví bị thay đổi để nơi gọi chốt trạng thái và tính lại total_value.
 */
export async function matchOrder(client: DbClient, orderId: number, symbol: string, coinId: number): Promise<{ orderIds: number[], walletIds: number[] }> {
  const orderIds = new Set<number>([orderId])
  const walletIds = new Set<number>()

  const taker = await queryOne<BookEntry>(
    `SELECT ${BOOK_ENTRY_COLUMNS}
       FROM order_book ob JOIN orders o ON o.id = ob.order_id
      WHERE ob.order_id = $1 AND ob.remaining_quantity > 0
      FOR UPDATE OF ob`,
    [orderId],
    client
  )
  if (!taker) return { orderIds: [...orderIds], walletIds: [] }

  const isBuy = taker.side === 'BUY'
  // BUY ăn giá bán thấp nhất trước; SELL ăn giá mua cao nhất trước; cùng giá → lệnh cũ trước.
  const counters = await query<BookEntry>(
    `SELECT ${BOOK_ENTRY_COLUMNS}
       FROM order_book ob JOIN orders o ON o.id = ob.order_id
      WHERE ob.symbol = $1 AND ob.side = $2 AND ob.remaining_quantity > 0
        AND o.user_id <> $3
        AND ${isBuy ? 'ob.price <= $4' : 'ob.price >= $4'}
      ORDER BY ob.price ${isBuy ? 'ASC' : 'DESC'}, ob.created_at ASC
      LIMIT ${MAX_COUNTERS_PER_MATCH}
      FOR UPDATE OF ob`,
    [symbol, isBuy ? 'SELL' : 'BUY', taker.user_id, taker.price],
    client
  )

  const ctx: MatchContext = { client, symbol, coinId, fees: await getFeeRates(symbol, client) }
  let takerRemaining = parseFloat(taker.remaining_quantity)

  for (const maker of counters) {
    if (takerRemaining <= 0) break
    const qty = round8(Math.min(takerRemaining, parseFloat(maker.remaining_quantity)))
    if (qty <= 0) continue

    const touched = await executeMatch(ctx, taker, maker, qty, parseFloat(maker.price))
    touched.forEach(id => walletIds.add(id))
    orderIds.add(maker.order_id)
    takerRemaining = round8(takerRemaining - qty)
  }

  return { orderIds: [...orderIds], walletIds: [...walletIds] }
}

/** Ghi 1 lần khớp: matches + trades + sổ phí + cập nhật lệnh, sổ lệnh, ví, coin. */
async function executeMatch(ctx: MatchContext, taker: BookEntry, maker: BookEntry, qty: number, price: number): Promise<number[]> {
  const { client } = ctx
  const [buy, sell] = taker.side === 'BUY' ? [taker, maker] : [maker, taker]
  const buyRole = buy === taker ? 'TAKER' : 'MAKER'
  const sellRole = sell === taker ? 'TAKER' : 'MAKER'
  const rateOf = (role: 'MAKER' | 'TAKER') => (role === 'TAKER' ? ctx.fees.taker : ctx.fees.maker)

  const total = round8(qty * price)
  const buyFee = round8(total * rateOf(buyRole))
  const sellFee = round8(total * rateOf(sellRole))

  const match = (await queryOne<{ id: number }>(
    `INSERT INTO matches (buy_order_id, sell_order_id, symbol, quantity, price)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [buy.order_id, sell.order_id, ctx.symbol, dec(qty), dec(price)],
    client
  ))!

  await execute(
    `INSERT INTO trades (user_id, symbol, side, role, quantity, price, total_cost, fee, match_id) VALUES
       ($1, $3, 'BUY',  $4, $6, $7, $8, $9,  $11),
       ($2, $3, 'SELL', $5, $6, $7, $8, $10, $11)`,
    [buy.user_id, sell.user_id, ctx.symbol, buyRole, sellRole, dec(qty), dec(price), dec(total), dec(buyFee), dec(sellFee), match.id],
    client
  )

  // Sổ phí sàn: 1 dòng MAKER (người trả = chủ lệnh maker) + 1 dòng TAKER.
  const [makerFee, takerFee] = buyRole === 'MAKER' ? [buyFee, sellFee] : [sellFee, buyFee]
  await execute(
    `INSERT INTO admin_fee_records (match_id, buyer_id, seller_id, payer_id, symbol, trading_volume, fee_amount, fee_type) VALUES
       ($1, $2, $3, $4, $6, $7, $8, 'MAKER'),
       ($1, $2, $3, $5, $6, $7, $9, 'TAKER')`,
    [match.id, buy.user_id, sell.user_id, maker.user_id, taker.user_id, ctx.symbol, dec(total), dec(makerFee), dec(takerFee)],
    client
  )

  // Lệnh + sổ lệnh: trừ trong SQL (NUMERIC) ⇒ về 0 chính xác, không cần epsilon.
  const ids = [buy.order_id, sell.order_id]
  await execute('UPDATE orders SET executed_quantity = executed_quantity + $1, updated_at = now() WHERE id = ANY($2::int[])', [dec(qty), ids], client)
  await execute('UPDATE order_book SET remaining_quantity = remaining_quantity - $1 WHERE order_id = ANY($2::int[])', [dec(qty), ids], client)

  // Người mua: nhả phần tiền đã giữ cho qty này, trả chi phí thật, HOÀN phần dư về ví.
  const release = round8(qty * parseFloat(buy.price) * (1 + parseFloat(buy.reserve_fee_rate)))
  const actualCost = Math.min(round8(total + buyFee), release)
  await execute('UPDATE orders SET reserved_cash = GREATEST(reserved_cash - $1, 0) WHERE id = $2', [dec(release), buy.order_id], client)
  const buyerWallet = (await queryOne<{ id: number }>(
    'UPDATE wallets SET cash_balance = cash_balance + $1, updated_at = now() WHERE user_id = $2 RETURNING id',
    [dec(release - actualCost), buy.user_id],
    client
  ))!
  await execute(
    `INSERT INTO wallet_holdings (wallet_id, coin_id, amount, avg_buy_price) VALUES ($1, $2, $3, $4)
     ON CONFLICT (wallet_id, coin_id) DO UPDATE SET
       avg_buy_price = (wallet_holdings.avg_buy_price * wallet_holdings.amount + EXCLUDED.amount * EXCLUDED.avg_buy_price)
                       / NULLIF(wallet_holdings.amount + EXCLUDED.amount, 0),
       amount        = wallet_holdings.amount + EXCLUDED.amount,
       updated_at    = now()`,
    [buyerWallet.id, ctx.coinId, dec(qty), dec(price)],
    client
  )

  // Người bán: coin đã khoá lúc đặt lệnh; nhận tiền − phí đúng vai.
  const sellerWallet = (await queryOne<{ id: number }>(
    'UPDATE wallets SET cash_balance = cash_balance + $1, updated_at = now() WHERE user_id = $2 RETURNING id',
    [dec(total - sellFee), sell.user_id],
    client
  ))!

  return [buyerWallet.id, sellerWallet.id]
}

/**
 * Chốt trạng thái các lệnh sau khi khớp: hết remaining → FILLED (xoá khỏi sổ, trả nốt tiền giữ còn dư
 * của BUY do làm tròn); khớp một phần → PARTIALLY_FILLED. Trả về id ví nhận tiền hoàn.
 */
export async function settleOrders(client: DbClient, orderIds: number[]): Promise<number[]> {
  if (!orderIds.length) return []

  await execute(
    `UPDATE orders SET status = CASE
         WHEN executed_quantity >= quantity THEN 'FILLED'
         WHEN executed_quantity > 0        THEN 'PARTIALLY_FILLED'
         ELSE status END,
       updated_at = now()
     WHERE id = ANY($1::int[]) AND status IN ('PENDING', 'PARTIALLY_FILLED')`,
    [orderIds],
    client
  )
  await execute('DELETE FROM order_book WHERE order_id = ANY($1::int[]) AND remaining_quantity <= 0', [orderIds], client)

  const leftovers = await query<{ id: number, user_id: number, reserved_cash: string }>(
    `SELECT id, user_id, reserved_cash FROM orders
      WHERE id = ANY($1::int[]) AND status = 'FILLED' AND side = 'BUY' AND reserved_cash > 0
      FOR UPDATE`,
    [orderIds],
    client
  )
  const walletIds: number[] = []
  for (const o of leftovers) {
    await execute('UPDATE orders SET reserved_cash = 0 WHERE id = $1', [o.id], client)
    const w = await queryOne<{ id: number }>(
      'UPDATE wallets SET cash_balance = cash_balance + $1, updated_at = now() WHERE user_id = $2 RETURNING id',
      [o.reserved_cash, o.user_id],
      client
    )
    if (w) walletIds.push(w.id)
  }
  return walletIds
}
