// Nitro plugin: mỗi 30s quét đề xuất AI đang OPEN → tự đóng khi chạm TP / SL hoặc quá hạn.
// Logic nằm ở analystHistoryService.scanOpen() — plugin chỉ lo lịch chạy.
import { analystHistoryService } from '../service/analyst/history.service'

const SCAN_INTERVAL_MS = 30_000

export default defineNitroPlugin((nitroApp) => {
  if (process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL) return

  const timer = setInterval(() => {
    analystHistoryService.scanOpen().catch(err => console.error('[analyst-tracker] scan failed:', err))
  }, SCAN_INTERVAL_MS)

  nitroApp.hooks.hook('close', () => clearInterval(timer))
})
