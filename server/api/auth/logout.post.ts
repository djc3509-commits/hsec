// POST /api/auth/logout — Xóa cookie auth_token.
import { authService } from '../../service/auth/auth.service'

export default defineEventHandler((event) => {
  return authService.logout(event)
})
