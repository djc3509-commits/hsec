// useRangeLabel — format khoảng thời gian + period thành label hiển thị.
// Dùng chung cho mọi chart trên trang Home để hiện "09/06 – 15/06 · Theo ngày".
import { format, differenceInDays } from 'date-fns'
import type { Ref } from 'vue'

export interface RangeInput {
  start: Date
  end: Date
}

export type PeriodInput = 'daily' | 'weekly' | 'monthly'

const PERIOD_LABEL: Record<PeriodInput, string> = {
  daily: 'theo ngày',
  weekly: 'theo tuần',
  monthly: 'theo tháng'
}

export function useRangeLabel(range: Ref<RangeInput>, period: Ref<PeriodInput>) {
  const rangeLabel = computed(() => {
    if (!range.value?.start || !range.value?.end) return ''
    const days = differenceInDays(range.value.end, range.value.start)
    // Shortcut cho dải phổ biến
    if (days === 6 || days === 7) return '7 ngày qua'
    if (days === 29 || days === 30) return '30 ngày qua'
    const start = format(range.value.start, 'dd/MM')
    const end = format(range.value.end, 'dd/MM')
    return `${start} – ${end}`
  })

  const periodLabel = computed(() => PERIOD_LABEL[period.value] ?? '')

  // Label kết hợp: "09/06 – 15/06 · theo ngày"
  const fullLabel = computed(() => {
    const r = rangeLabel.value
    const p = periodLabel.value
    return r && p ? `${r} · ${p}` : r || p
  })

  return { rangeLabel, periodLabel, fullLabel }
}
