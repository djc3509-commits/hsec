// GET /api/coins — Danh sách coin (PUBLIC): phân trang + tìm kiếm + sắp xếp.
import { coinService } from '../../service/coin/coin.service'
import { isValidCoinSort } from '../../dtos/coin'
import type { CoinListQuery } from '../../dtos/coin'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)

  // Parse + validate tại ranh giới HTTP → service nhận CoinListQuery sạch.
  const query: CoinListQuery = {
    page: q.page ? Number(q.page) : undefined,
    limit: q.limit ? Number(q.limit) : undefined,
    search: typeof q.search === 'string' ? q.search : undefined,
    sort: isValidCoinSort(q.sort) ? q.sort : undefined
  }

  return coinService.list(query)
})
