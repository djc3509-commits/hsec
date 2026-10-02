// POST /api/analyst/analyze — endpoint mỏng cho AI Analyst.
// Validate body bằng Zod, delegate cho analystService.analyze().
// KHÔNG lưu DB ở đây — chỉ /save mới persist (lịch sử = đề xuất user chủ động lưu).
import { analyze } from '../../service/analyst/analyst.service'
import { requireUserId } from '../../utils/auth'
import { analystInputSchema } from '../../utils/analyst-schema'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const body = await readBody(event)
  const parsed = analystInputSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Body không hợp lệ',
      data: parsed.error.flatten()
    })
  }

  // persist = false → chỉ phân tích, không ghi lịch sử
  return analyze(parsed.data, userId, false)
})
