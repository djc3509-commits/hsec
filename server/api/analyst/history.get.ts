// GET /api/analyst/history — Lịch sử + thống kê đề xuất AI của user.
import { requireUserId } from '../../utils/auth'
import { analystHistoryService } from '../../service/analyst/history.service'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 20))
  return analystHistoryService.list(userId, page, limit)
})
