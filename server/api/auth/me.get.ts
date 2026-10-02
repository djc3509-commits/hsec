// GET /api/auth/me — Trả user hiện tại (yêu cầu đăng nhập).
import { authService } from '../../service/auth/auth.service'
import { requireUserId } from '../../utils/auth'

export default defineEventHandler((event) => {
  const userId = requireUserId(event)
  return authService.me(userId)
})
