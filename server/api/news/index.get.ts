// GET /api/news?category=macro|bitcoin|altcoin|defi|nft|regulation|all&page=1 — danh sách tin (công khai).
import { newsService } from '../../service/news/news.service'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const category = typeof q.category === 'string' ? q.category : 'all'
  const page = Math.max(1, Number(q.page) || 1)
  return { status: true, data: await newsService.list(category, page) }
})
