// PATCH /api/chat/active — set con trỏ chat đang xem cho user hiện tại.
// Body: { chatId: string | null }   null = clear (vd "Chat mới")
import { z } from 'zod'
import { authService } from '../../service/auth/auth.service'

const Schema = z.object({
  chatId: z.string().min(1).max(64).nullable()
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId as number
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })

  const parsed = Schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dữ liệu không hợp lệ', data: parsed.error.flatten() })
  }

  await authService.setLastActiveChat(userId, parsed.data.chatId)
  return { ok: true }
})
