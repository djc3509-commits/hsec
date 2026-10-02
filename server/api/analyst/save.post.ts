// POST /api/analyst/save — lưu 1 đề xuất vào lịch sử (user chủ động bấm "Lưu báo cáo").
// Dùng lại analyze() với persist=true; trong 5 phút sẽ hit cache → không gọi lại LLM.
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

  const output = await analyze(parsed.data, userId, true)
  return { recommendationId: output.recommendationId }
})
