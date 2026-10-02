// composables/orders/useOrderNotifications.ts
import type { OrderListResult, OrderStatus } from '../../../server/dtos/order'

interface KnownState {
  status: OrderStatus
  executedQuantity: number
}

export function useOrderNotifications(onOrderFilled: () => void, intervalMs = 3000) {
  const toast = useToast()
  const known = new Map<number, KnownState>()
  let timer: ReturnType<typeof setInterval> | null = null
  let firstRun = true

  async function poll() {
    try {
      const res = await $fetch<OrderListResult>('/api/orders/list', { query: { limit: 50 } })

      for (const o of res.orders) {
        const prev = known.get(o.id)

        if (firstRun) {
          known.set(o.id, { status: o.status, executedQuantity: o.executedQuantity })
          continue
        }

        const prevStatus = prev?.status ?? 'PENDING'
        const prevQty = prev?.executedQuantity ?? 0
        known.set(o.id, { status: o.status, executedQuantity: o.executedQuantity })

        const statusChanged = prevStatus !== o.status
        const qtyChanged = o.status === 'PARTIALLY_FILLED' && o.executedQuantity !== prevQty
        if (!statusChanged && !qtyChanged) continue

        const isBuy = o.side === 'BUY'
        const coin = o.symbol.replace('USDT', '')
        const sideTxt = isBuy ? 'MUA' : 'BÁN'

        if (o.status === 'FILLED') {
          onOrderFilled()
          toast.add({
            title: `Lệnh ${sideTxt} đã khớp!`,
            description: `${formatPrice(o.executedQuantity)} ${coin} @ $${formatPrice(o.price)}`,
            icon: 'i-heroicons-check-badge',
            color: 'success',
            duration: 3000
          })
        } else if (o.status === 'PARTIALLY_FILLED') {
          onOrderFilled()
          toast.add({
            title: 'Khớp một phần',
            description: `${formatPrice(o.executedQuantity)} / ${formatPrice(o.quantity)} ${coin} @ $${formatPrice(o.price)}`,
            icon: 'i-heroicons-bolt',
            color: 'warning',
            duration: 3000
          })
        }
      }

      firstRun = false
    } catch { /* silent */ }
  }

  function start() {
    if (timer) return
    poll()
    timer = setInterval(poll, intervalMs)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return { start, stop, refresh: poll }
}
