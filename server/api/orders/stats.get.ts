// GET /api/orders/stats — Đếm lệnh theo trạng thái cho user (status bar).
// Tuỳ chọn filter theo [from, to].
import { orderService } from '../../service/orders/order.service'
import { requireUserId } from '../../utils/auth'
import { OrderStatsQuerySchema } from '../../dtos/order'

export default defineEventHandler((event) => {
  const userId = requireUserId(event)
  const { from, to } = OrderStatsQuerySchema.parse(getQuery(event))
  return orderService.getStats(userId, { from, to })
})
