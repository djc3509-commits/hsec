// GET /api/news/[id] — chi tiết 1 bài + tăng lượt xem (công khai).
import { newsService } from '../../service/news/news.service'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID bài viết không hợp lệ' })
  }
  return { status: true, data: { article: await newsService.getById(id) } }
})
