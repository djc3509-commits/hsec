/**
 * Điều hướng sang `/orders` với symbol. Tự convert base 'BTC' → pair 'BTCUSDT'
 * để page orders nhận đúng format (page lookup theo pair).
 */
export function useNavigateToCoin() {
  const router = useRouter()

  function goToCoin(symbol: string) {
    const pair = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`
    router.push({ path: '/orders', query: { symbol: pair } })
  }

  return { goToCoin }
}
