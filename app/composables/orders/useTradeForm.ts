// composables/orders/useTradeForm.ts
// 1 instance = 1 side (BUY hoặc SELL). Trước đây mỗi instance có 6 ref cho cả buy+sell
// dù chỉ dùng 1 → tạo 2 instance = 12 ref trùng. Giờ chỉ giữ price/qty + dẫn xuất total/fee.
import type { Ref } from 'vue'
import type {
  CreateOrderRequest, FeeConfig, OrderCreated
} from '../../../server/dtos/order'
import { DEFAULT_MAKER_FEE, DEFAULT_TAKER_FEE } from '../../../server/dtos/order'

export type TradeSide = 'buy' | 'sell'

export interface WalletInfo {
  cashBalance: number
  coinBalance: number
  coinSymbol: string
}

export interface TradeFormCallbacks {
  /** Gọi sau khi đặt lệnh thành công — page refresh ví/stats/recent/panel. */
  onOrderPlaced?: () => void
}

export function useTradeForm(
  side: TradeSide,
  symbol: Ref<string>,
  wallet: Ref<WalletInfo>,
  callbacks: TradeFormCallbacks = {}
) {
  const toast = useToast()
  const isBuy = side === 'buy'

  const orderType = ref<'LIMIT' | 'MARKET'>('LIMIT')
  const price = ref<number>(0)
  const qty = ref<number | null>(null)
  const feeRate = ref<number>(isBuy ? DEFAULT_MAKER_FEE : DEFAULT_TAKER_FEE)
  const isSubmitting = ref(false)

  // BUY: total = qty × price × (1+fee). SELL: total = qty × price × (1−fee)
  const feeMultiplier = computed(() => isBuy ? 1 + feeRate.value : 1 - feeRate.value)

  const feeAmount = computed<number>(() => {
    if (!qty.value || !price.value) return 0
    return parseFloat((qty.value * price.value * feeRate.value).toFixed(8))
  })

  const total = computed<number | null>({
    get() {
      if (!qty.value || !price.value) return null
      return parseFloat((qty.value * price.value * feeMultiplier.value).toFixed(2))
    },
    set(val) {
      if (!val || !price.value) {
        qty.value = null
        return
      }
      qty.value = parseFloat((val / (price.value * feeMultiplier.value)).toFixed(6))
    }
  })

  async function loadFeeRate() {
    try {
      const res = await $fetch<FeeConfig>('/api/orders/fee-config', { query: { symbol: symbol.value } })
      feeRate.value = isBuy ? res.maker : res.taker
    } catch (err) {
      console.warn('[useTradeForm] Không lấy được fee, dùng mặc định:', err)
    }
  }

  function setPct(pct: number) {
    if (isBuy) {
      const available = parseFloat((wallet.value.cashBalance / (1 + feeRate.value)).toFixed(2))
      const trading = parseFloat((available * pct / 100).toFixed(2))
      qty.value = price.value > 0 ? parseFloat((trading / price.value).toFixed(6)) : null
    } else {
      qty.value = parseFloat((wallet.value.coinBalance * pct / 100).toFixed(6))
    }
  }

  function setBBO(bboPrice?: number) {
    price.value = bboPrice ? parseFloat(bboPrice.toFixed(2)) : 0
  }

  function reset() {
    qty.value = null
  }

  async function submit() {
    if (isSubmitting.value) return

    const sideLabel = isBuy ? 'MUA' : 'BÁN'
    const coin = wallet.value.coinSymbol

    if (!qty.value || qty.value <= 0) {
      toastError(`Đặt lệnh ${sideLabel} thất bại`, 'Vui lòng nhập số lượng hợp lệ')
      return
    }
    if (orderType.value === 'LIMIT' && (!price.value || price.value <= 0)) {
      toastError(`Đặt lệnh ${sideLabel} thất bại`, 'Vui lòng nhập giá hợp lệ')
      return
    }

    const snapshot = { price: price.value, qty: qty.value, total: total.value ?? 0 }

    const req: CreateOrderRequest = {
      symbol: symbol.value,
      side: isBuy ? 'BUY' : 'SELL',
      type: orderType.value,
      price: price.value || undefined,
      quantity: qty.value
    }

    isSubmitting.value = true
    try {
      await $fetch<OrderCreated>('/api/orders/create', { method: 'POST', body: req })

      toast.add({
        title: `Lệnh ${sideLabel} đặt thành công`,
        description: `${snapshot.qty.toFixed(4)} ${coin} · $${snapshot.price.toFixed(2)} · ~$${snapshot.total.toFixed(2)} USDT`,
        icon: isBuy ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down',
        color: isBuy ? 'success' : 'error',
        duration: 3000
      })

      reset()
      callbacks.onOrderPlaced?.()
    } catch (err) {
      const e = err as { data?: { statusMessage?: string }, statusMessage?: string }
      toastError(
        `Đặt lệnh ${sideLabel} thất bại`,
        e?.data?.statusMessage || e?.statusMessage || 'Vui lòng thử lại'
      )
    } finally {
      isSubmitting.value = false
    }
  }

  function toastError(title: string, description: string) {
    toast.add({ title, description, icon: 'i-heroicons-exclamation-circle', color: 'error', duration: 4000 })
  }

  return {
    side,
    orderType,
    price, qty, total, feeRate, feeAmount,
    isSubmitting,
    loadFeeRate, setPct, setBBO, reset, submit
  }
}
