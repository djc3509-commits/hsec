// Nitro plugin: nạp danh mục coin lần đầu (database trống) rồi đồng bộ giá từ Binance mỗi 30s.
// Logic nằm trong coinService — plugin chỉ lo lịch chạy.
import { coinService } from '../service/coin/coin.service'

const SYNC_INTERVAL_MS = 30_000

export default defineNitroPlugin((nitroApp) => {
  if (!process.env.DATABASE_URL) {
    console.warn('[priceSync] bỏ qua: chưa cấu hình DATABASE_URL')
    return
  }

  const sync = () => coinService.syncPrices()

  coinService.ensureSeeded()
    .catch(err => console.error('[priceSync] nạp danh mục coin lỗi:', err))
    .finally(sync)

  const timer = setInterval(sync, SYNC_INTERVAL_MS)
  nitroApp.hooks.hook('close', () => clearInterval(timer))
})
