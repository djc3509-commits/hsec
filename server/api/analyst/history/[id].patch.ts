// PATCH /api/analyst/history/[id] — Đóng tay đề xuất đang OPEN tại giá hiện tại.
import { requireUserId } from '../../../utils/auth'
import { analystHistoryService } from '../../../service/analyst/history.service'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID không hợp lệ' })
  }
  return analystHistoryService.closeManually(userId, id)
})
