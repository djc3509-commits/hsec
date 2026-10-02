// GET /api/orders/fee-config — Maker/Taker fee (PUBLIC, phục vụ form đặt lệnh).
import { orderService } from '../../service/orders/order.service'

export default defineEventHandler(async (event) => {
  const symbol = (getQuery(event).symbol as string) || '*'
  return orderService.getFeeConfig(symbol)
})
