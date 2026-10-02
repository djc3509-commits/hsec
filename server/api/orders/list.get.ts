// GET /api/orders/list — Danh sách lệnh của user (validate query bằng zod).
import { orderService } from '../../service/orders/order.service'
import { requireUserId } from '../../utils/auth'
import { OrderListQuerySchema } from '../../dtos/order'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const parsed = OrderListQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Query không hợp lệ'
    })
  }
  return orderService.list(userId, parsed.data)
})
