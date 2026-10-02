// useCoinStream — phủ GIÁ LIVE (WebSocket Binance) lên coin đang HIỂN THỊ.
// Singleton client: 1 WS cho cả app, chỉ subscribe symbol đang xem (theo viewport),
// gom tick bằng requestAnimationFrame (≤60fps) thay vì update mỗi tick → hết lag/đơ.
import type { CoinTick } from '../../../server/dtos/coin'

// ── State dùng chung (chỉ ghi phía client) ───────────────────
const ticks = shallowRef(new Map<string, CoinTick>()) // symbol → giá live
const watching = new Map<string, number>() // symbol → số view đang xem (ref-count)
const buffer = new Map<string, { c: string, o: string }>() // tick thô chờ gom

let ws: WebSocket | null = null
let rafId: number | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let connectDebounce: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0 // tăng mỗi lần ws đóng, reset khi open

// Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (cap)
function backoffDelay(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** Math.min(attempt - 1, 5))
}

// Gom mọi tick trong 1 khung hình → ghi Map 1 lần, báo reactive 1 lần
function flush() {
  rafId = null
  if (!buffer.size) return
  const map = ticks.value
  for (const [symbol, raw] of buffer) {
    const price = parseFloat(raw.c)
    const open = parseFloat(raw.o)
    const prev = map.get(symbol)
    const direction: CoinTick['direction']
      = !prev ? 'neutral' : price > prev.price ? 'up' : price < prev.price ? 'down' : 'neutral'
    map.set(symbol, { symbol, price, changePercent24h: open > 0 ? ((price - open) / open) * 100 : 0, direction })
  }
  buffer.clear()
  triggerRef(ticks)
}

function scheduleFlush() {
  if (rafId === null) rafId = requestAnimationFrame(flush)
}

// Mở lại WS với đúng tập symbol đang xem
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

  const symbols = [...watching.keys()]
  if (!symbols.length) return

  const streams = symbols.map(s => `${s.toLowerCase()}usdt@miniTicker`).join('/')
  ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)

  // nối được → reset bậc backoff
  ws.onopen = () => {
    reconnectAttempts = 0
  }
  ws.onmessage = (ev) => {
    try {
      const t = JSON.parse(ev.data)?.data
      if (!t?.s || !t?.c) return
      buffer.set(String(t.s).replace('USDT', ''), { c: t.c, o: t.o })
      scheduleFlush()
    } catch { /* bỏ qua tick lỗi */ }
  }
  ws.onclose = () => {
    reconnectAttempts++
    const delay = backoffDelay(reconnectAttempts)
    reconnectTimer = setTimeout(reconnect, delay)
  }
  ws.onerror = (e) => {
    // Chỉ log khi dev — tránh nhiễu console production.
    if (import.meta.dev) console.warn('[coinStream] ws error', e)
  }
}

// Debounce: gộp các thay đổi symbol liên tiếp (scroll/đổi trang) → 1 lần reconnect
function scheduleReconnect() {
  if (!import.meta.client) return
  if (connectDebounce) clearTimeout(connectDebounce)
  connectDebounce = setTimeout(reconnect, 300)
}

// Ref-count: chỉ reconnect khi tập symbol thực sự đổi
function acquire(symbols: string[]) {
  let changed = false
  for (const s of symbols) {
    const n = watching.get(s) ?? 0
    if (n === 0) changed = true
    watching.set(s, n + 1)
  }
  if (changed) scheduleReconnect()
}
function release(symbols: string[]) {
  let changed = false
  for (const s of symbols) {
    const n = watching.get(s) ?? 0
    if (n <= 1) {
      watching.delete(s)
      changed = true
    } else {
      watching.set(s, n - 1)
    }
  }
  if (changed) scheduleReconnect()
}

export function useCoinStream() {
  // Đăng ký danh sách symbol đang hiển thị; tự acquire/release theo thay đổi
  // và tự release khi component unmount.
  function watchSymbols(source: MaybeRefOrGetter<string[]>) {
    if (!import.meta.client) return
    let current: string[] = []
    const stop = watchEffect(() => {
      const next = (toValue(source) ?? []).filter(Boolean)
      const cur = new Set(current), nxt = new Set(next)
      const added = next.filter(s => !cur.has(s))
      const removed = current.filter(s => !nxt.has(s))
      if (added.length) acquire(added)
      if (removed.length) release(removed)
      current = next
    })
    onScopeDispose(() => {
      release(current)
      stop()
    })
  }

  return { ticks, watchSymbols }
}
