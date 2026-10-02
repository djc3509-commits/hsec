// composables/orders/useOrderHistory.ts
// Chỉ lo: list orders + cancel + refresh khi panel mở.
// Notify (FILLED/PARTIAL_FILLED toast) đã tách sang useOrderNotifications.
// ★ Chi tiết lệnh: cache lazy-load khi user mở UCollapsible từng dòng.
// ★ Đã bỏ phân trang FE — luôn tải full danh sách theo tab (phân trang/lọc theo thời gian để sau).
import type { Order, OrderDetail, OrderListResult, OrderStatus } from '../../../server/dtos/order'

// ── Constants UI ──
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ khớp',
  PARTIALLY_FILLED: 'Khớp một phần',
  FILLED: 'Đã khớp',
  CANCELED: 'Đã hủy'
}

export const ORDER_STATUS_COLOR: Record<OrderStatus, 'warning' | 'info' | 'success' | 'neutral'> = {
  PENDING: 'warning',
  PARTIALLY_FILLED: 'info',
  FILLED: 'success',
  CANCELED: 'neutral'
}

export type OrderTab = 'open' | 'history' | 'filled' | 'canceled'

export const ORDER_TABS: { label: string, value: OrderTab }[] = [
  { label: 'Đang mở', value: 'open' },
  { label: 'Tất cả', value: 'history' },
  { label: 'Đã khớp', value: 'filled' },
  { label: 'Đã hủy', value: 'canceled' }
]

const TAB_STATUS: Record<OrderTab, OrderStatus | undefined> = {
  open: undefined,
  history: undefined,
  filled: 'FILLED',
  canceled: 'CANCELED'
}

const OPEN_STATUSES: OrderStatus[] = ['PENDING', 'PARTIALLY_FILLED']

export function useOrderHistory(symbol: Ref<string>, onOrderFilled: () => void) {
  const toast = useToast()

  const showOrderPanel = ref(false)
  const activeOrderTab = ref<OrderTab>('open')
  const myOrders = ref<Order[]>([])
  const ordersLoading = ref(false)
  const cancellingId = ref<number | null>(null)
  const lastRefresh = ref('--')

  // ★ Chi tiết lệnh khi expand từng dòng — cache theo id để tránh gọi lại API
  // mỗi lần đóng/mở cùng 1 dòng. Map thay vì object để giữ reactivity tường minh.
  const orderDetails = ref<Map<number, OrderDetail>>(new Map())
  const loadingDetailId = ref<number | null>(null)

  const openOrdersCount = computed(() => myOrders.value.filter(o => OPEN_STATUSES.includes(o.status)).length)
  const displayOrders = computed(() =>
    activeOrderTab.value === 'open'
      ? myOrders.value.filter(o => OPEN_STATUSES.includes(o.status))
      : myOrders.value
  )

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  async function fetchOrders() {
    ordersLoading.value = myOrders.value.length === 0
    try {
      const res = await $fetch<OrderListResult>('/api/orders/list', {
        query: {
          status: TAB_STATUS[activeOrderTab.value]
          // ★ không gửi page/limit — BE trả full danh sách theo status
        }
      })
      myOrders.value = res.orders
      lastRefresh.value = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    } catch { /* silent */ } finally {
      ordersLoading.value = false
    }
  }

  /**
   * Tải chi tiết 1 lệnh (dùng cho UCollapsible mở ra).
   * force=true để bỏ qua cache — dùng sau khi cancel/order vừa được cập nhật.
   */
  async function loadDetail(id: number, force = false) {
    if (!force && orderDetails.value.has(id)) return
    loadingDetailId.value = id
    try {
      const detail = await $fetch<OrderDetail>(`/api/orders/${id}`)
      // Tạo Map mới để đảm bảo Vue tracking thay đổi đúng (Map.set không tự trigger reactivity sâu)
      const next = new Map(orderDetails.value)
      next.set(id, detail)
      orderDetails.value = next
    } catch {
      /* silent — component tự hiện fallback nếu thiếu detail */
    } finally {
      if (loadingDetailId.value === id) loadingDetailId.value = null
    }
  }

  function invalidateDetail(id: number) {
    if (!orderDetails.value.has(id)) return
    const next = new Map(orderDetails.value)
    next.delete(id)
    orderDetails.value = next
  }

  async function cancelOrder(id: number) {
    cancellingId.value = id
    try {
      await $fetch(`/api/orders/${id}/cancel`, { method: 'DELETE' })
      invalidateDetail(id) // ★ dữ liệu chi tiết cũ (role/fee/lastMatchedAt) đã lỗi thời sau khi huỷ
      await fetchOrders()
      onOrderFilled() // refund → ví/stats refresh
      toast.add({
        title: 'Đã hủy lệnh',
        description: `Lệnh #${id} đã được hủy thành công`,
        icon: 'i-heroicons-x-circle',
        color: 'neutral',
        duration: 3000
      })
    } catch (e) {
      toast.add({
        title: 'Hủy lệnh thất bại',
        description: (e as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Vui lòng thử lại',
        icon: 'i-heroicons-exclamation-triangle',
        color: 'error',
        duration: 4000
      })
    } finally {
      cancellingId.value = null
    }
  }

  function open() {
    showOrderPanel.value = true
  }
  function toggle() {
    showOrderPanel.value = !showOrderPanel.value
  }

  function start() {
    if (refreshTimer) return
    refreshTimer = setInterval(() => {
      if (showOrderPanel.value) fetchOrders()
    }, 3000)
  }

  function stop() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  watch(activeOrderTab, () => {
    fetchOrders()
  })
  watch(showOrderPanel, (isOpen) => {
    if (isOpen) fetchOrders()
  })
  watch(symbol, () => {
    if (showOrderPanel.value) fetchOrders()
  })

  onUnmounted(stop)

  return {
    showOrderPanel, activeOrderTab, displayOrders, ordersLoading, openOrdersCount,
    lastRefresh, cancellingId,
    fetchOrders, cancelOrder, start, stop, startPolling: start, stopPolling: stop,
    open, toggle,
    // ★ chi tiết lệnh
    orderDetails, loadingDetailId, loadDetail, invalidateDetail
  }
}
