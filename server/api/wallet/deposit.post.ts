// POST /api/wallet/deposit — Nạp tiền vào ví.
import { walletService } from '../../service/wallet/wallet.service'
import { requireUserId } from '../../utils/auth'
import type { DepositRequest } from '../../dtos/wallet'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const body = await readBody<DepositRequest>(event)
  return walletService.deposit(userId, body ?? { amount: 0 })
})
