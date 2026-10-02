// useAnalystHistory — Composable cho trang Hiệu suất AI (/analyst/history).
// Quản lý: tải lịch sử + thống kê, xóa 1 / xóa tất cả, đóng lệnh thủ công,
// và dẫn xuất equity curve. Tách khỏi page để component chỉ còn lo render.
import type { HistoryResult, HistoryStats, RecDetail, RecHistoryRow } from '../../../server/dtos/analyst'

export interface CloseResult {
  status: string
  pnl: number
  exitPrice: number
}

export function useAnalystHistory(limit = 50, initialCapital = 5000) {
  const { t } = useI18n()
  const data = ref<HistoryResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Dẫn xuất gọn cho template ──────────────────────────────
  const items = computed<RecHistoryRow[]>(() => data.value?.items ?? [])
  const stats = computed<HistoryStats | null>(() => data.value?.stats ?? null)
  const total = computed(() => data.value?.total ?? 0)
  const isEmpty = computed(() => !loading.value && !!data.value && total.value === 0)

  // ── Tải lịch sử + thống kê ─────────────────────────────────
  async function load() {
    loading.value = true
    error.value = null
    try {
      data.value = await $fetch<HistoryResult>('/api/analyst/history', { query: { limit } })
    } catch (err) {
      error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || t('analyst.history.loadFailed')
    } finally {
      loading.value = false
    }
  }

  // ── Mutations (luôn reload lại để stats đồng bộ) ────────────
  async function removeOne(id: number) {
    await $fetch(`/api/analyst/history/${id}`, { method: 'DELETE' })
    await load()
  }

  async function removeAll() {
    await $fetch('/api/analyst/history', { method: 'DELETE' })
    await load()
  }

  async function closePosition(id: number): Promise<CloseResult> {
    const res = await $fetch<CloseResult>(`/api/analyst/history/${id}`, { method: 'PATCH' })
    await load()
    return res
  }

  // Chi tiết đầy đủ 1 đề xuất (cho modal).
  function getDetail(id: number): Promise<RecDetail> {
    return $fetch<RecDetail>(`/api/analyst/history/${id}`)
  }

  // ── Equity curve: vốn ban đầu + pnl cộng dồn theo thời gian ──
  const equityPoints = computed<number[]>(() => {
    if (!items.value.length) return [initialCapital]
    const sorted = [...items.value].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    let cum = initialCapital
    const pts: number[] = [cum]
    for (const r of sorted) {
      cum += r.pnl
      pts.push(cum)
    }
    return pts
  })

  const finalEquity = computed(() => initialCapital + (stats.value?.totalPnl ?? 0))
  const growthPct = computed(() => (finalEquity.value / initialCapital - 1) * 100)

  return {
    // state
    data, loading, error,
    // derived
    items, stats, total, isEmpty,
    initialCapital, equityPoints, finalEquity, growthPct,
    // actions
    load, removeOne, removeAll, closePosition, getDetail
  }
}
