// GET /api/wallet/overview — Tổng quan ví: cashBalance + giá trị coin + tổng.
import { walletService } from '../../service/wallet/wallet.service'
import { requireUserId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  return walletService.getOverview(userId)
})
