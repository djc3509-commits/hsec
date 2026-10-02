// POST /api/auth/register — validate body bằng zod, delegate sang service.
import { authService } from '../../service/auth/auth.service'
import { RegisterSchema } from '../../dtos/auth'

export default defineEventHandler(async (event) => {
  const parsed = RegisterSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Body không hợp lệ'
    })
  }
  return authService.register(parsed.data, event)
})
