// GET /api/orders/book — Sổ lệnh (PUBLIC).
import { orderService } from '../../service/orders/order.service'
import { OrderBookQuerySchema } from '../../dtos/order'

export default defineEventHandler(async (event) => {
  const { symbol, depth } = OrderBookQuerySchema.parse(getQuery(event))
  return orderService.getBook(symbol, depth)
})
