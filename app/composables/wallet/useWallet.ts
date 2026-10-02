// Composable wallet — pattern useCoinCatalog (state + load actions).
// State (overview, holdings, transactions, chart) qua useState để dùng chung trong page.
// Không Pinia — chỉ $fetch + useState.
import type {
  Holding, WalletOverview, WalletChartPoint, WalletChartResult,
  WalletTransaction, WalletChartQuery,
  DepositRequest, DepositResult
} from '../../../server/dtos/wallet'

export function useWallet() {
  const overview = ref<WalletOverview | null>(null)
  const holdings = ref<Holding[]>([])
  const transactions = ref<WalletTransaction[]>([])
  const chart = ref<WalletChartPoint[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Load từng phần ──
  async function loadOverview() {
    overview.value = await $fetch<WalletOverview>('/api/wallet/overview')
  }

  async function loadHoldings() {
    holdings.value = await $fetch<Holding[]>('/api/wallet/holdings')
  }

  async function loadTransactions(limit = 8) {
    transactions.value = await $fetch<WalletTransaction[]>('/api/wallet/transactions', {
      query: { limit }
    })
  }

  async function loadChart(query: WalletChartQuery = {}) {
    const res = await $fetch<WalletChartResult>('/api/wallet/chart', { query })
    chart.value = res.points
  }

  // ── Init: load tất cả song song ──
  async function init() {
    loading.value = true
    error.value = null
    try {
      await Promise.all([
        loadOverview(),
        loadHoldings(),
        loadTransactions(),
        loadChart()
      ])
    } catch (err) {
      error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Lỗi tải ví'
    } finally {
      loading.value = false
    }
  }

  // ── Nạp tiền — sau khi xong tự reload overview + transactions ──
  async function deposit(req: DepositRequest): Promise<DepositResult> {
    const result = await $fetch<DepositResult>('/api/wallet/deposit', {
      method: 'POST',
      body: req
    })
    await Promise.all([loadOverview(), loadTransactions()])
    return result
  }

  return {
    // state
    overview, holdings, transactions, chart, loading, error,
    // actions
    init, loadOverview, loadHoldings, loadTransactions, loadChart, deposit
  }
}
