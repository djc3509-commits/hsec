// GET /api/wallet/transactions — Lịch sử giao dịch gần đây.
import { walletService } from '../../service/wallet/wallet.service'
import { requireUserId } from '../../utils/auth'
import type { WalletTransactionQuery } from '../../dtos/wallet'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const q = getQuery(event)

  const query: WalletTransactionQuery = {
    limit: q.limit ? Number(q.limit) : undefined,
    offset: q.offset ? Number(q.offset) : undefined
  }

  return walletService.getRecentTransactions(userId, query)
})
