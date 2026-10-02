// GET /api/home/sentiment — Tâm lý thị trường (tỉ lệ BUY/SELL toàn hệ thống).
// Tuỳ chọn filter theo [from, to].
import { homeService } from '../../service/home/home.service'
import { DateRangeQuerySchema } from '../../dtos/home'

export default defineEventHandler((event) => {
  const { from, to } = DateRangeQuerySchema.parse(getQuery(event))
  return homeService.getSentiment({ from, to })
})
