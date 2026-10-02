// GET /api/orders/recent-trades — Lệnh khớp gần nhất theo symbol (PUBLIC).
import { orderService } from '../../service/orders/order.service'
import { RecentTradesQuerySchema } from '../../dtos/order'

export default defineEventHandler(async (event) => {
  const { symbol, limit } = RecentTradesQuerySchema.parse(getQuery(event))
  return orderService.getRecentTrades(symbol, limit)
})
