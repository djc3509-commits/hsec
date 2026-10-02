// useTradingGlossary — Nguồn chung cho thuật ngữ giao dịch + nhãn enum của Analyst.
// i18n-driven: tên thuật ngữ tiếng Anh (canonical) giữ trong code; phần gloss + giải thích
// + nhãn enum + nhãn trạng thái lấy từ locale (analyst.glossary / analyst.labels / analyst.status)
// nên tự đổi khi chuyển ngôn ngữ. Dùng cho bảng lịch sử + modal chi tiết.
import type { RecStatus } from '../../../server/dtos/analyst'

export interface Term { en: string, vi: string, desc: string }
export type BadgeColor = 'info' | 'success' | 'error' | 'neutral'

// Tên thuật ngữ tiếng Anh (canonical — không đổi theo locale).
const EN: Record<string, string> = {
  winRate: 'Win Rate', pnl: 'PnL (Profit & Loss)', bestTrade: 'Best Trade', open: 'Open Positions',
  equity: 'Equity Curve', horizon: 'Horizon / Timeframe', direction: 'Direction', confidence: 'Confidence',
  entry: 'Entry Price', exit: 'Exit Price', stopLoss: 'Stop Loss (SL)', takeProfit: 'Take Profit (TP)',
  positionSize: 'Position Size', leverage: 'Leverage', notional: 'Notional Value', liquidation: 'Liquidation Price',
  riskReward: 'Risk / Reward', long: 'Long', short: 'Short',
  scalp: 'Scalp', day: 'Day Trade', swing: 'Swing Trade', position: 'Position Trade',
  HIT_TP: 'Hit Take Profit', HIT_SL: 'Hit Stop Loss', EXPIRED: 'Expired'
}

const STATUS_ICON: Record<RecStatus, string> = {
  OPEN: 'i-lucide-clock', HIT_TP: 'i-lucide-check-circle-2', HIT_SL: 'i-lucide-x-circle', EXPIRED: 'i-lucide-timer-off'
}
const STATUS_COLOR: Record<RecStatus, BadgeColor> = {
  OPEN: 'info', HIT_TP: 'success', HIT_SL: 'error', EXPIRED: 'neutral'
}

export function useTradingGlossary() {
  const { t } = useI18n()

  // Lấy 1 thuật ngữ (gọi trong computed/template/render → reactive theo locale).
  function term(key: string): Term {
    return {
      en: EN[key] ?? key,
      vi: t(`analyst.glossary.${key}.name`),
      desc: t(`analyst.glossary.${key}.desc`)
    }
  }
  // Nhãn tiếng Việt/Anh cho 1 giá trị enum.
  function tlabel(group: string, key: string | null | undefined): string {
    if (!key) return '—'
    return t(`analyst.labels.${group}.${key}`)
  }
  function statusBadge(s: RecStatus) {
    return {
      color: STATUS_COLOR[s] ?? 'info',
      icon: STATUS_ICON[s] ?? STATUS_ICON.OPEN,
      label: t(`analyst.status.${s}`)
    }
  }
  function statusTerm(s: RecStatus): Term {
    return term(s === 'OPEN' ? 'open' : s)
  }
  function fmtPrice(n: number): string {
    if (n < 1) return n.toFixed(4)
    if (n < 100) return n.toFixed(2)
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  return { term, tlabel, statusBadge, statusTerm, fmtPrice }
}
