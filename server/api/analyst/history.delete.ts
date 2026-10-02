// DELETE /api/analyst/history — Xoá TOÀN BỘ lịch sử đề xuất của user.
import { requireUserId } from '../../utils/auth'
import { analystHistoryService } from '../../service/analyst/history.service'

export default defineEventHandler(async (event) => {
  return analystHistoryService.deleteAll(requireUserId(event))
})
