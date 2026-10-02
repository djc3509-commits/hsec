// GET /api/coins/:symbol — 1 coin theo symbol (PUBLIC).
import { coinService } from '../../service/coin/coin.service'

export default defineEventHandler(async (event) => {
  const symbol = getRouterParam(event, 'symbol')
  if (!symbol) {
    throw createError({ statusCode: 400, statusMessage: 'Thiếu symbol' })
  }

  const coin = await coinService.getBySymbol(symbol)
  if (!coin) {
    throw createError({ statusCode: 404, statusMessage: `Không tìm thấy coin: ${symbol}` })
  }

  return coin
})
