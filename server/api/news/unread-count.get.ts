// GET /api/news/unread-count — số bài mới đăng trong 24 giờ qua (công khai).
import { newsService } from '../../service/news/news.service'

export default defineEventHandler(async () => {
  const count = await newsService.countRecent()
  return { status: true, data: { count, message: `${count} bài viết mới` } }
})
