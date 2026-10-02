// useKlineStream — phủ TICK LIVE (WebSocket Binance) lên nến đang vẽ.
// Singleton client: 1 WS cho cả app, ref-count theo (symbol, interval),
// gom tick bằng requestAnimationFrame (≤60fps), reconnect exponential backoff.
//
// Khác useCoinStream: key = `${symbol}@${interval}` (cùng BTC nhưng 1h vs 1d
// là 2 stream khác nhau ở Binance).
import type { KlineInterval, KlineTick } from '../../../server/dtos/kline'

// ── State dùng chung (chỉ ghi phía client) ───────────────────
const ticks = shallowRef(new Map<string, KlineTick>()) // key → tick mới nhất
const watching = new Map<string, number>() // key → số chart đang xem (ref-count)
const buffer = new Map<string, KlineTick>() // tick chờ flush

let ws: WebSocket | null = null
let rafId: number | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let connectDebounce: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0

// Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (cap)
function backoffDelay(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** Math.min(attempt - 1, 5))
}

// Gom mọi tick trong 1 khung hình → ghi Map 1 lần, báo reactive 1 lần
function flush() {
  rafId = null
  if (!buffer.size) return
  const map = new Map(ticks.value)
  for (const [key, tick] of buffer) map.set(key, tick)
  buffer.clear()
  ticks.value = map
}

function scheduleFlush() {
  if (rafId === null) rafId = requestAnimationFrame(flush)
}

// Build danh sách stream từ tập key đang watch
function buildStream(): string {
  return [...watching.keys()].map((k) => {
    const [sym, tf] = k.split('@')
    return `${sym!.toLowerCase()}usdt@kline_${tf}`
  }).join('/')
}

// Mở lại WS với đúng tập (symbol, interval) đang xem
function reconnect() {
  if (!import.meta.client) return
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  const stream = buildStream()
  if (!stream) return

  ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${stream}`)

  // nối được → reset bậc backoff
  ws.onopen = () => {
    reconnectAttempts = 0
  }

  ws.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data)?.data
      const k = d?.k
      if (!k) return
      const symbol = String(d.s).replace(/USDT$/, '')
      const interval = k.i as KlineInterval
      const key = `${symbol}@${interval}`
      if (!watching.has(key)) return // bỏ qua tick không ai xem

      buffer.set(key, {
        symbol, interval,
        time: Math.floor(k.t / 1000),
        open: +k.o,
        high: +k.h,
        low: +k.l,
        close: +k.c,
        volume: +k.v,
        isFinal: !!k.x
      })
      scheduleFlush()
    } catch { /* bỏ qua tick lỗi */ }
  }

  ws.onclose = () => {
    reconnectAttempts++
    reconnectTimer = setTimeout(reconnect, backoffDelay(reconnectAttempts))
  }

  ws.onerror = (e) => {
    if (import.meta.dev) console.warn('[klineStream] ws error', e)
  }
}

// Debounce: gộp các thay đổi watching liên tiếp → 1 lần reconnect
function scheduleReconnect() {
  if (!import.meta.client) return
  if (connectDebounce) clearTimeout(connectDebounce)
  connectDebounce = setTimeout(reconnect, 300)
}

// Ref-count: chỉ reconnect khi tập key thực sự thay đổi
function acquire(key: string) {
  const n = watching.get(key) ?? 0
  watching.set(key, n + 1)
  if (n === 0) scheduleReconnect()
}

function release(key: string) {
  const n = watching.get(key) ?? 0
  if (n <= 1) {
    watching.delete(key)
    scheduleReconnect()
  } else {
    watching.set(key, n - 1)
  }
}

export function useKlineStream() {
  /**
   * Đăng ký 1 cặp (symbol, interval) để nhận tick.
   * Tự acquire/release khi nguồn đổi, và tự release khi component unmount.
   */
  function watchPair(
    symbolSrc: MaybeRefOrGetter<string>,
    intervalSrc: MaybeRefOrGetter<KlineInterval>
  ) {
    if (!import.meta.client) return
    let current = ''
    const stop = watchEffect(() => {
      const sym = toValue(symbolSrc)
      const tf = toValue(intervalSrc)
      const next = sym && tf ? `${sym.toUpperCase()}@${tf}` : ''
      if (next === current) return
      if (current) release(current)
      if (next) acquire(next)
      current = next
    })
    onScopeDispose(() => {
      if (current) release(current)
      stop()
    })
  }

  return { ticks, watchPair }
}
