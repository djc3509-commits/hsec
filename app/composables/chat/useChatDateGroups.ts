// IMPORT
import { subMonths, isToday, isYesterday, isValid } from 'date-fns'
import type { UISession, UISessionGroup } from '../../../server/dtos/chat'

// EXPORT
export function useChatDateGroups(sessions: Ref<UISession[] | undefined>) {
  const groups = computed<UISessionGroup[]>(() => {
    // Khởi tạo các nhóm cố định
    const buckets: Record<string, UISession[]> = {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: []
    }
    // Nhóm động theo tháng/năm cho chat cũ hơn 1 tháng
    const older: Record<string, UISession[]> = {}

    const oneWeekAgo = subMonths(new Date(), 0.25) // ~7 ngày
    const oneMonthAgo = subMonths(new Date(), 1)

    sessions.value?.forEach((session) => {
      const parsed = new Date(session.createdAt)
      const date = isValid(parsed) ? parsed : new Date()

      if (isToday(date)) buckets.today!.push(session)
      else if (isYesterday(date)) buckets.yesterday!.push(session)
      else if (date >= oneWeekAgo) buckets.lastWeek!.push(session)
      else if (date >= oneMonthAgo) buckets.lastMonth!.push(session)
      else {
        // VD: "January 2025", "December 2024"
        const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        if (!older[key]) older[key] = []
        older[key]!.push(session)
      }
    })

    // Các nhóm cố định — chỉ push nếu có data
    const FIXED = [
      { id: 'today', label: 'Today', items: buckets.today! },
      { id: 'yesterday', label: 'Yesterday', items: buckets.yesterday! },
      { id: 'last-week', label: 'Last week', items: buckets.lastWeek! },
      { id: 'last-month', label: 'Last month', items: buckets.lastMonth! }
    ]

    const result: UISessionGroup[] = FIXED
      .filter(g => g.items.length > 0)
      .map(g => ({ label: g.label, items: g.items }))

    // Nhóm động (cũ hơn 1 tháng) — sort từ mới nhất
    Object.keys(older)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach((key) => {
        if (older[key]!.length) {
          result.push({ label: key, items: older[key]! })
        }
      })

    return result
  })

  return { groups }
}
