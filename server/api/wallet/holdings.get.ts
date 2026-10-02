// GET /api/wallet/holdings — Danh sách coin user đang giữ trong ví.
import { walletService } from '../../service/wallet/wallet.service'
import { requireUserId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  return walletService.getHoldings(userId)
})
