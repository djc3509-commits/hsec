// HOME SERVICE — số liệu cho Home Dashboard.
import { query } from '../../utils/db'
import type { HomeMarketSentiment, DateRangeQuery } from '../../dtos/home'
import { dateRangeWhere } from '../../utils/sql'

class HomeService {
  /** Tỉ lệ lệnh BUY/SELL toàn hệ thống trong [from, to]; không truyền range → toàn thời gian. */
  async getSentiment(opts: DateRangeQuery = {}): Promise<HomeMarketSentiment> {
    const { where, params } = dateRangeWhere(opts)
    const rows = await query<{ side: 'BUY' | 'SELL', cnt: number }>(
      `SELECT side, COUNT(*) AS cnt FROM orders ${where ? `WHERE ${where}` : ''} GROUP BY side`,
      params
    )

    const buyCount = rows.find(r => r.side === 'BUY')?.cnt ?? 0
    const sellCount = rows.find(r => r.side === 'SELL')?.cnt ?? 0
    const total = buyCount + sellCount
    const buyRatio = total > 0 ? Math.round((buyCount / total) * 100) : 50
    const score = buyRatio

    const label: HomeMarketSentiment['label']
      = score >= 75
        ? 'extreme_greed'
        : score >= 60 ? 'greed' : score >= 40 ? 'neutral' : score >= 25 ? 'fear' : 'extreme_fear'

    return { buyCount, sellCount, total, buyRatio, sellRatio: 100 - buyRatio, score, label }
  }
}

export const homeService = new HomeService()
