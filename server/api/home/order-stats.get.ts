// GET /api/home/order-stats — Đếm lệnh theo trạng thái TOÀN HỆ THỐNG (home dashboard).
// Public-ish: không cần userId vì stats tổng quan.
import { orderService } from '../../service/orders/order.service'
import { DateRangeQuerySchema } from '../../dtos/home'

export default defineEventHandler((event) => {
  const { from, to } = DateRangeQuerySchema.parse(getQuery(event))
  return orderService.getSystemStats({ from, to })
})
