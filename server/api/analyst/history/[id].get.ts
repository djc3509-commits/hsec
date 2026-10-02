// GET /api/analyst/history/[id] — Chi tiết 1 đề xuất của user (cho modal).
import { requireUserId } from '../../../utils/auth'
import { analystHistoryService } from '../../../service/analyst/history.service'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID không hợp lệ' })
  }
  return analystHistoryService.getDetail(userId, id)
})
