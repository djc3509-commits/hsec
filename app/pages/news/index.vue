<!--
  /news — Layout 3 cột tinh tế, CoinDesk-inspired
  Đọc tin tức từ DB (read-only). Không cào, không badge nguồn.
-->
<script setup lang="ts">
interface NewsItem {
  id: number
  title: string
  summary: string
  image: string
  source: string
  sourceUrl: string
  category: string
  views: number
  likes: number
  publishedAt: string
  timeAgo: string
  content?: string
  isFeatured?: boolean
}

const { t } = useI18n()

const activeCategory = ref('all')
const currentPage = ref(1)
const searchQuery = ref('')

const categories = computed(() => [
  { label: t('news.categories.all'), value: 'all', icon: 'i-heroicons-sparkles' },
  { label: t('news.categories.macro'), value: 'macro', icon: 'i-heroicons-chart-bar-square' },
  { label: t('news.categories.bitcoin'), value: 'bitcoin', icon: 'i-simple-icons-bitcoin' },
  { label: t('news.categories.altcoin'), value: 'altcoin', icon: 'i-heroicons-coins' },
  { label: t('news.categories.defi'), value: 'defi', icon: 'i-heroicons-building-library' },
  { label: t('news.categories.nft'), value: 'nft', icon: 'i-heroicons-paint-brush' },
  { label: t('news.categories.regulation'), value: 'regulation', icon: 'i-heroicons-scale' }
])

const categoryColors: Record<string, string> = {
  macro: 'text-blue-600    bg-blue-50    dark:text-blue-300    dark:bg-blue-900/30',
  bitcoin: 'text-orange-600  bg-orange-50  dark:text-orange-300  dark:bg-orange-900/30',
  altcoin: 'text-violet-600  bg-violet-50  dark:text-violet-300  dark:bg-violet-900/30',
  defi: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30',
  nft: 'text-pink-600    bg-pink-50    dark:text-pink-300    dark:bg-pink-900/30',
  regulation: 'text-red-600     bg-red-50     dark:text-red-300     dark:bg-red-900/30'
}
const categoryDot: Record<string, string> = {
  macro: 'bg-blue-500',
  bitcoin: 'bg-orange-500',
  altcoin: 'bg-violet-500',
  defi: 'bg-emerald-500',
  nft: 'bg-pink-500',
  regulation: 'bg-red-500'
}
const categoryLabels = computed<Record<string, string>>(() => ({
  macro: t('news.categories.macro'), bitcoin: t('news.categories.bitcoin'), altcoin: t('news.categories.altcoin'),
  defi: t('news.categories.defi'), nft: t('news.categories.nft'), regulation: t('news.categories.regulation')
}))

// ── Fetch ─────────────────────────────────────────────────
const { data, pending } = await useFetch<{
  data?: {
    hero?: NewsItem[]
    list?: NewsItem[]
    pagination?: { total: number, totalPages: number }
  }
}>('/api/news', {
  query: computed(() => ({
    category: activeCategory.value === 'all' ? undefined : activeCategory.value,
    page: currentPage.value
  })),
  watch: [activeCategory, currentPage]
})

const hero = computed<NewsItem[]>(() => data.value?.data?.hero || [])
const newsList = computed<NewsItem[]>(() => data.value?.data?.list || [])
const pagination = computed(() => data.value?.data?.pagination || { total: 0, totalPages: 1 })

const latestFeed = computed(() => [...newsList.value]
  .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
  .slice(0, 12))

const featuredHero = computed(() => hero.value[0] || newsList.value[0] || null)
const featuredSide = computed(() => {
  const skipId = featuredHero.value?.id
  return [...hero.value, ...newsList.value]
    .filter((item, idx, arr) => item.id !== skipId && arr.findIndex(x => x.id === item.id) === idx)
    .slice(0, 3)
})

const topRead = computed(() => [...newsList.value]
  .sort((a, b) => b.views - a.views)
  .slice(0, 5))

// ── Helpers ──────────────────────────────────────────────
function timeHHMM(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}
function fmtViews(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0) + 'k'
  return (n / 1_000_000).toFixed(1) + 'M'
}

// ── Navigation ───────────────────────────────────────
function openArticle(item: NewsItem) {
  navigateTo(`/news/${item.id}`)
}

watch(activeCategory, () => {
  currentPage.value = 1
})
</script>

<template>
  <UDashboardPanel class="flex flex-col h-screen overflow-hidden">
    <UDashboardNavbar :title="t('news.navbar.title')">
      <template #leading>
        <UDashboardSidebarCollapse icon="i-lucide-newspaper" />
      </template>
      <template #right>
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="t('news.navbar.searchPlaceholder')"
          class="w-64"
        />
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-bell"
          square
        />
      </template>
    </UDashboardNavbar>

    <div class="flex-1 min-h-0 bg-default overflow-hidden">
      <div class="h-full mx-auto w-full px-4 lg:px-6 py-5 max-w-[1600px]">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          <!-- ════════════════════════════════════════════════════════════ -->
          <!-- LEFT — Tin mới nhất (timeline)                                -->
          <!-- ════════════════════════════════════════════════════════════ -->
          <aside class="lg:col-span-3 order-2 lg:order-1 overflow-y-auto max-h-[calc(100vh-57px)]">
            <div class="sticky top-0 z-10 bg-default/95 backdrop-blur-md pb-3 pt-1 mb-2">
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40"
                >
                  <UIcon
                    name="i-lucide-rss"
                    class="text-emerald-600 dark:text-emerald-400 w-3.5 h-3.5"
                  />
                </span>
                <h3 class="font-bold text-sm text-highlighted">
                  {{ t('news.latest.title') }}
                </h3>
                <span class="ml-auto text-[10px] text-muted tabular-nums font-semibold uppercase tracking-wider">{{
                  t('news.latest.live') }}</span>
                <span class="relative flex h-2 w-2">
                  <span
                    class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                  />
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </div>
            </div>

            <div class="border-t border-default pt-3">
              <p class="text-[10px] font-bold tracking-widest text-muted uppercase mb-3 px-1">
                {{ t('news.latest.today')
                }}
              </p>

              <div class="space-y-0">
                <button
                  v-for="item in latestFeed"
                  :key="item.id"
                  class="w-full text-left py-3 px-2 group hover:bg-elevated/60 rounded-lg transition-all border-b border-default last:border-b-0"
                  @click="openArticle(item)"
                >
                  <div class="flex items-center gap-1.5 mb-1.5">
                    <UIcon
                      name="i-lucide-clock"
                      class="w-3 h-3 text-rose-500"
                    />
                    <span class="text-[11px] font-bold text-rose-500 tabular-nums">
                      {{ isToday(item.publishedAt) ? timeHHMM(item.publishedAt) : item.timeAgo }}
                    </span>
                    <span class="w-1 h-1 rounded-full bg-default" />
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :class="categoryDot[item.category]"
                    />
                    <span class="text-[10px] font-semibold text-muted uppercase tracking-wide">
                      {{ categoryLabels[item.category] }}
                    </span>
                  </div>
                  <p
                    class="text-[13px] font-semibold leading-snug text-highlighted line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-1"
                  >
                    {{ item.title }}
                  </p>
                  <p class="text-[11px] text-muted line-clamp-2 leading-relaxed">
                    {{ item.summary }}
                  </p>
                </button>
              </div>
            </div>
          </aside>

          <!-- ════════════════════════════════════════════════════════════ -->
          <!-- CENTER — Featured + Grid                                      -->
          <!-- ════════════════════════════════════════════════════════════ -->
          <main class="lg:col-span-6 order-1 lg:order-2 space-y-6 overflow-y-auto max-h-[calc(100vh-57px)] pb-6">
            <!-- Featured Stories -->
            <section v-if="featuredHero">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2.5">
                  <span
                    class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40"
                  >
                    <UIcon
                      name="i-lucide-flame"
                      class="text-amber-600 dark:text-amber-400 w-4 h-4"
                    />
                  </span>
                  <h2 class="text-lg font-black text-highlighted">
                    {{ t('news.featured.title') }}
                  </h2>
                </div>
                <UButton
                  :label="t('news.featured.viewAll')"
                  variant="link"
                  color="neutral"
                  size="xs"
                  trailing-icon="i-lucide-arrow-right"
                  @click="() => { activeCategory = 'all' }"
                />
              </div>

              <!-- Category pills -->
              <div class="flex gap-2 mb-5 overflow-x-auto whitespace-nowrap">
                <UButton
                  v-for="cat in categories.slice(0, 6)"
                  :key="cat.value"
                  :label="cat.label"
                  variant="soft"
                  size="xs"
                  :color="activeCategory === cat.value ? 'primary' : 'neutral'"
                  class="rounded-full font-bold shrink-0"
                  @click="() => { activeCategory = cat.value }"
                >
                  <template
                    v-if="cat.value !== 'all'"
                    #leading
                  >
                    <UIcon
                      :name="cat.icon"
                      class="h-3.5 w-3.5"
                    />
                  </template>
                  {{ cat.label }}
                </UButton>
              </div>

              <!-- Hero + 3 side -->
              <div class="grid grid-cols-1 md:grid-cols-5 gap-5">
                <button
                  class="md:col-span-3 group text-left"
                  @click="openArticle(featuredHero)"
                >
                  <div class="relative aspect-16/10 rounded-2xl overflow-hidden bg-elevated shadow-sm">
                    <img
                      v-if="featuredHero.image"
                      :src="featuredHero.image"
                      :alt="featuredHero.title"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    >
                    <div class="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                    <div class="absolute top-4 left-4">
                      <span
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg"
                      >
                        <span class="relative flex h-1.5 w-1.5">
                          <span
                            class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"
                          />
                          <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                        </span>
                        {{ t('news.latest.live') }}
                      </span>
                    </div>
                  </div>
                  <p class="text-[10px] font-bold uppercase tracking-widest text-rose-500 mt-4 mb-1">
                    {{ categoryLabels[featuredHero.category] || t('news.categories.tech') }}
                  </p>
                  <h3
                    class="text-xl font-bold text-highlighted leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-3"
                  >
                    {{ featuredHero.title }}
                  </h3>
                  <div class="flex items-center gap-2 mt-3 text-xs text-muted">
                    <UIcon
                      name="i-lucide-clock"
                      class="w-3 h-3"
                    />
                    <span class="font-semibold text-rose-500">{{ t('news.featured.updatedAt', {
                      time:
                        featuredHero.timeAgo
                    }) }}</span>
                  </div>
                </button>

                <div class="md:col-span-2 space-y-4 divide-y divide-default">
                  <button
                    v-for="(item, idx) in featuredSide"
                    :key="item.id"
                    class="w-full text-left group block"
                    :class="idx > 0 ? 'pt-4' : ''"
                    @click="openArticle(item)"
                  >
                    <p class="text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">
                      {{ categoryLabels[item.category] }}
                    </p>
                    <h4
                      class="text-sm font-bold leading-snug text-highlighted group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-3"
                    >
                      {{ item.title }}
                    </h4>
                    <p class="text-[11px] text-muted mt-2 flex items-center gap-1">
                      <UIcon
                        name="i-lucide-clock"
                        class="w-3 h-3"
                      />
                      {{ item.timeAgo }}
                    </p>
                  </button>
                </div>
              </div>
            </section>

            <!-- Divider -->
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-default" />
              </div>
              <div class="relative flex justify-start">
                <span class="bg-default pr-3 text-[11px] font-bold tracking-widest text-muted uppercase">{{
                  t('news.divider.recent') }}</span>
              </div>
            </div>

            <!-- News Grid -->
            <section>
              <div class="flex items-center gap-3 mb-5">
                <h3 class="font-bold text-base text-highlighted">
                  {{ activeCategory === 'all' ? t('news.grid.allNews') : categories.find(c => c.value
                    === activeCategory)?.label }}
                </h3>
                <UBadge
                  :label="t('news.grid.articleCount', { count: pagination.total })"
                  color="neutral"
                  variant="soft"
                  size="xs"
                />
              </div>

              <div
                v-if="pending"
                class="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                <div
                  v-for="i in 4"
                  :key="i"
                  class="rounded-2xl bg-elevated/60 animate-pulse"
                >
                  <div class="aspect-video bg-elevated/80 rounded-t-2xl" />
                  <div class="p-4 space-y-2">
                    <div class="h-4 bg-elevated/80 rounded w-3/4" />
                    <div class="h-3 bg-elevated/80 rounded w-full" />
                    <div class="h-3 bg-elevated/80 rounded w-1/2" />
                  </div>
                </div>
              </div>

              <div
                v-else-if="newsList.length"
                class="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                <button
                  v-for="item in newsList"
                  :key="item.id"
                  class="group text-left rounded-2xl overflow-hidden bg-default border border-default hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  @click="openArticle(item)"
                >
                  <div class="aspect-video overflow-hidden bg-elevated relative">
                    <img
                      v-if="item.image"
                      :src="item.image"
                      :alt="item.title"
                      class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    >
                    <div class="absolute top-3 left-3">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shadow-sm backdrop-blur-sm"
                        :class="categoryColors[item.category]"
                      >
                        {{ categoryLabels[item.category] }}
                      </span>
                    </div>
                  </div>

                  <div class="p-4">
                    <h4
                      class="font-bold text-[15px] text-highlighted line-clamp-2 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                    >
                      {{ item.title }}
                    </h4>
                    <p class="text-xs text-muted line-clamp-2 mt-2 leading-relaxed">
                      {{ item.summary }}
                    </p>

                    <div class="flex items-center justify-between mt-4 pt-3 border-t border-default">
                      <span class="text-[11px] font-bold text-primary-600 dark:text-primary-400">{{ item.source
                      }}</span>
                      <div class="flex items-center gap-3 text-[11px] text-muted">
                        <span class="flex items-center gap-1">
                          <UIcon
                            name="i-lucide-clock"
                            class="w-3 h-3"
                          />
                          {{ item.timeAgo }}
                        </span>
                        <span class="flex items-center gap-1 tabular-nums">
                          <UIcon
                            name="i-lucide-eye"
                            class="w-3 h-3"
                          />
                          {{ fmtViews(item.views) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <div
                v-else
                class="py-20 text-center text-muted bg-elevated/30 rounded-2xl border border-dashed border-default"
              >
                <UIcon
                  name="i-lucide-newspaper"
                  class="w-12 h-12 mx-auto mb-3 opacity-30"
                />
                <p class="text-sm font-medium">
                  Chưa có tin tức nào trong danh mục này
                </p>
                <p class="text-xs mt-1 opacity-70">
                  Quay lại sau hoặc chọn danh mục khác
                </p>
              </div>

              <div
                v-if="pagination.totalPages > 1"
                class="flex justify-center pt-6"
              >
                <UPagination
                  v-model:page="currentPage"
                  :total="pagination.total"
                  :items-per-page="10"
                />
              </div>
            </section>
          </main>

          <!-- ════════════════════════════════════════════════════════════ -->
          <!-- RIGHT — Promo + Top + Categories                              -->
          <!-- ════════════════════════════════════════════════════════════ -->
          <aside class="lg:col-span-3 order-3 space-y-4 overflow-y-auto max-h-[calc(100vh-57px)]">
            <!-- Promo -->
            <div
              class="relative rounded-2xl overflow-hidden bg-linear-to-br from-violet-600 via-purple-600 to-pink-500 p-5 text-white shadow-lg"
            >
              <div
                class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white_0%,transparent_60%)] opacity-20"
              />
              <div class="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
              <div class="relative">
                <div
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/20 backdrop-blur text-[10px] font-bold uppercase tracking-widest mb-3"
                >
                  <UIcon
                    name="i-lucide-zap"
                    class="w-3 h-3"
                  />
                  HSEC Live
                </div>
                <h3 class="text-xl font-semibold leading-tight">
                  Theo dõi giá realtime mọi đồng coin
                </h3>
                <p class="text-xs opacity-90 mt-2 leading-relaxed">
                  WebSocket Binance trực tiếp · Cập nhật từng tick ·
                  Không
                  trễ
                </p>
                <UButton
                  to="/markets"
                  label="Khám phá Markets"
                  trailing-icon="i-lucide-arrow-right"
                  color="neutral"
                  variant="solid"
                  size="xs"
                  class="mt-4"
                />
              </div>
            </div>

            <!-- Đọc nhiều -->
            <div class="bg-default rounded-2xl border border-default overflow-hidden">
              <div class="px-4 py-3 border-b border-default flex items-center gap-2 bg-elevated/30">
                <UIcon
                  name="i-lucide-flame"
                  class="text-orange-500 w-4 h-4"
                />
                <h3 class="font-bold text-sm">
                  Đọc nhiều nhất
                </h3>
              </div>
              <div class="divide-y divide-default">
                <button
                  v-for="(item, i) in topRead"
                  :key="item.id"
                  class="w-full flex items-start gap-3 px-4 py-3 hover:bg-elevated/60 text-left transition-colors group"
                  @click="openArticle(item)"
                >
                  <span
                    class="text-2xl font-semibold tabular-nums leading-none mt-0.5 shrink-0"
                    :class="i === 0 ? 'text-orange-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-default'"
                  >
                    {{ i + 1 }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <p
                      class="text-xs font-semibold text-highlighted line-clamp-2 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                    >
                      {{ item.title }}
                    </p>
                    <div class="flex items-center gap-2 text-[10px] text-muted mt-1.5">
                      <span class="flex items-center gap-0.5">
                        <UIcon
                          name="i-lucide-clock"
                          class="w-2.5 h-2.5"
                        />
                        {{ item.timeAgo }}
                      </span>
                      <span>·</span>
                      <span class="flex items-center gap-0.5 tabular-nums">
                        <UIcon
                          name="i-lucide-eye"
                          class="w-2.5 h-2.5"
                        />
                        {{ fmtViews(item.views) }}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Danh mục -->
            <!-- <div class="bg-default rounded-2xl border border-default p-4">
              <div class="flex items-center gap-2 mb-3">
                <UIcon name="i-lucide-layers" class="text-primary-500 w-4 h-4" />
                <h3 class="font-bold text-sm">Danh mục</h3>
              </div>
            </div> -->

            <!-- Newsletter -->
            <div class="bg-linear-to-br from-elevated/40 to-default rounded-2xl border border-default p-4">
              <div class="flex items-center gap-2 mb-1">
                <UIcon
                  name="i-lucide-mail"
                  class="text-primary-500 w-4 h-4"
                />
                <h3 class="font-bold text-sm">
                  Nhận tin mỗi sáng
                </h3>
              </div>
              <p class="text-[11px] text-muted mb-3 leading-relaxed">
                Tổng hợp 5 tin nóng nhất trong ngày qua email
              </p>
              <div class="space-y-2">
                <UInput
                  placeholder="email@example.com"
                  size="sm"
                  icon="i-lucide-at-sign"
                />
                <UButton
                  label="Đăng ký miễn phí"
                  color="primary"
                  size="sm"
                  block
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </UDashboardPanel>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  scrollbar-width: none;
}
</style>
