// Lấy danh sách coin từ /api/coins: phân trang + tìm kiếm + sắp xếp.
// State cục bộ cho mỗi nơi gọi (giá live do useCoinStream lo riêng — bước sau).
import type { Coin, CoinListResult, CoinSort } from '../../../server/dtos/coin'
import { DEFAULT_COIN_SORT, DEFAULT_COIN_LIMIT } from '../../../server/dtos/coin'

export function useCoinCatalog() {
  const items = ref<Coin[]>([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(DEFAULT_COIN_LIMIT)
  const search = ref('')
  const sort = ref<CoinSort>(DEFAULT_COIN_SORT)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<CoinListResult>('/api/coins', {
        query: {
          page: page.value,
          limit: limit.value,
          search: search.value.trim() || undefined,
          sort: sort.value
        }
      })
      items.value = res.items
      total.value = res.total
    } catch (err) {
      error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Không tải được danh sách coin'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  // Đổi tiêu chí → về trang 1 rồi load lại
  function setSort(s: CoinSort) {
    sort.value = s
    page.value = 1
    load()
  }
  function setSearch(q: string) {
    search.value = q
    page.value = 1
    load()
  }
  function setPage(p: number) {
    page.value = Math.min(Math.max(1, p), totalPages.value)
    load()
  }

  return {
    items, total, page, limit, search, sort, loading, error, totalPages,
    load, setSort, setSearch, setPage
  }
}
