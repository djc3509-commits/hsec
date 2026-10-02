/**
 * ============================================================================
 * FORMAT UTILITIES
 * ----------------------------------------------------------------------------
 * Pure utility functions - dùng được cả client và server (Nitro).
 * Không phụ thuộc Vue, Nuxt hay Browser API.
 * ============================================================================
 */

/* -------------------------------------------------------------------------- */
/*                                  PRICE                                     */
/* -------------------------------------------------------------------------- */

/**
 * Format giá coin.
 *
 * locale mặc định là 'en-US' để có thể dùng từ server.
 * Khi dùng trong UI nên truyền locale hiện tại.
 */
export function formatPrice(
  n: number,
  locale = 'en-US'
): string {
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0.00'

  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)

  if (abs >= 10000) {
    return sign + abs.toLocaleString(locale, {
      maximumFractionDigits: 0
    })
  }

  if (abs >= 1000) {
    return sign + abs.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  if (abs >= 1) {
    return sign + abs.toFixed(4)
  }

  if (abs >= 0.0001) {
    return sign + abs.toFixed(6)
  }

  return sign + abs.toExponential(4)
}

/**
 * Format khối lượng giao dịch.
 */
export function formatVolume(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'

  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)

  if (abs >= 1_000_000_000) {
    return sign + (abs / 1_000_000_000).toFixed(2) + 'B'
  }

  if (abs >= 1_000_000) {
    return sign + (abs / 1_000_000).toFixed(2) + 'M'
  }

  if (abs >= 1_000) {
    return sign + (abs / 1_000).toFixed(2) + 'K'
  }

  return sign + abs.toFixed(2)
}

/**
 * Format phần trăm thay đổi giá.
 */
export function formatChange(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

/* -------------------------------------------------------------------------- */
/*                                  SYMBOL                                    */
/* -------------------------------------------------------------------------- */

const QUOTE_ASSETS = ['USDT', 'BTC', 'ETH']

/**
 * BTCUSDT -> BTC / USDT
 */
export function formatSymbol(symbol: string): string {
  for (const quote of QUOTE_ASSETS) {
    if (symbol.endsWith(quote)) {
      return `${symbol.slice(0, -quote.length)} / ${quote}`
    }
  }

  return symbol
}

export function formatTimeAgo(
  dateInput: Date | string
): string {
  if (!dateInput) return ''

  const date = new Date(dateInput)
  const diffMs = Date.now() - date.getTime()

  if (diffMs < 0) return 'Vừa xong'

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)

  if (seconds < 60) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`
  if (months < 12) return `${months} tháng trước`

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
