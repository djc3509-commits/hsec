// GET /api/klines/candles — Nến (kline) từ Binance, qua KlineService.
// Mỏng: chỉ parse + validate ranh giới HTTP → call service.
import { klineService } from '../../service/kline/kline.service'
import { isValidKlineInterval } from '../../dtos/kline'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)

  const symbol = String(q.symbol ?? 'BTC').toUpperCase().replace(/USDT$/, '')
  const interval = isValidKlineInterval(q.interval) ? q.interval : undefined
  const limit = q.limit ? Number(q.limit) : undefined

  return klineService.fetchCandles({ symbol, interval, limit })
})
