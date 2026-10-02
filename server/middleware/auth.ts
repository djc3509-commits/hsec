import { verifyAuthToken } from '../utils/auth'

export default defineEventHandler((event) => {
  const path = event.path
  // Bảo vệ /api/chat và /api/posts (các route khác tự gọi requireUserId)
  if (path.startsWith('/api/chat') || path.startsWith('/api/posts')) {
    const cookie = getCookie(event, 'auth_token')
    if (!cookie) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    try {
      event.context.userId = verifyAuthToken(cookie).id
    } catch {
      throw createError({ statusCode: 401, statusMessage: 'Token sai hoặc hết hạn' })
    }
  }
})
