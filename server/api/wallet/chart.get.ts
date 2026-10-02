// GET /api/wallet/chart — Chart P&L theo period (daily/weekly/monthly).
import { walletService } from '../../service/wallet/wallet.service'
import { requireUserId } from '../../utils/auth'
import { isValidChartPeriod } from '../../dtos/wallet'
import type { WalletChartQuery } from '../../dtos/wallet'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const q = getQuery(event)

  const query: WalletChartQuery = {
    period: isValidChartPeriod(q.period) ? q.period : undefined,
    from: typeof q.from === 'string' ? q.from : undefined,
    to: typeof q.to === 'string' ? q.to : undefined
  }

  return walletService.getChart(userId, query)
})
