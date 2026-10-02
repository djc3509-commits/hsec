// PUT /api/user/profile — cập nhật fullname.
import { userService } from '../../service/user/user.service'
import { requireUserId } from '../../utils/auth'
import { UpdateProfileSchema } from '../../dtos/user'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const parsed = UpdateProfileSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Body không hợp lệ'
    })
  }
  return userService.updateProfile(userId, parsed.data)
})
