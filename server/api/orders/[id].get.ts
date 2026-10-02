// GET /api/orders/:id — Chi tiết lệnh (chỉ owner).
import { orderService } from '../../service/orders/order.service'
import { requireUserId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const id = parseInt(getRouterParam(event, 'id') ?? '0', 10)
  return orderService.getById(userId, id)
})
