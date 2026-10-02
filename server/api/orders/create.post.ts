// POST /api/orders/create — Tạo lệnh mới (validate body bằng zod).
import { orderService } from '../../service/orders/order.service'
import { requireUserId } from '../../utils/auth'
import { CreateOrderSchema } from '../../dtos/order'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const parsed = CreateOrderSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Body không hợp lệ'
    })
  }
  return orderService.create(userId, parsed.data)
})
