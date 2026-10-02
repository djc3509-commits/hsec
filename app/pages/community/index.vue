<template>
  <UDashboardPanel class="flex flex-col h-screen overflow-hidden ">
    <!-- ═══ TOP NAV ═══ -->
    <UDashboardNavbar :title="t('community.nav.title')">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      <template #right>
        <UInput
          :placeholder="t('community.nav.searchPlaceholder')"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          variant="soft"
          class="hidden sm:block w-56"
        />
        <UButton
          icon="i-heroicons-bell"
          variant="ghost"
          color="neutral"
          size="sm"
        />
        <UButton
          size="xs"
          color="primary"
          icon="i-heroicons-pencil-square"
          :label="t('community.nav.write')"
          @click="focusPost"
        />
      </template>
    </UDashboardNavbar>

    <!-- ═══ MAIN GRID ═══ -->
    <div
      class="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[0.8fr_1.8fr_0.9fr]"
    >
      <!-- ── COL LEFT ── -->
      <div
        class="hidden lg:flex flex-col gap-3 p-3 overflow-y-auto border-r border-default bg-default scrollbar-hide fade-in-up"
        style="animation-delay: 0ms"
      >
        <!-- User Card -->
        <UCard
          :ui="{ root: 'bg-linear-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary/20 overflow-hidden', body: 'p-4' }"
        >
          <UUser
            :name="user?.fullname"
            :description="t('community.activeMember')"
            :avatar="{ src: user?.avatar ?? undefined, alt: user?.fullname, size: 'md', ui: { root: 'ring-2 ring-white/30' } }"
            size="md"
            :ui="{ name: 'text-white font-black text-sm', description: 'text-white/70 text-[11px]' }"
          />
          <div class="grid grid-cols-3 gap-2 text-center mt-3">
            <div
              v-for="stat in userStats"
              :key="stat.label"
              class="bg-white/10 rounded-xl py-1.5"
            >
              <p class="font-black text-sm text-white">
                {{ stat.value }}
              </p>
              <p class="text-[9px] text-white/70">
                {{ stat.label }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Sentiment Meter -->
        <UCard :ui="{ body: 'p-4' }">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-semibold uppercase tracking-widest text-muted">
              {{ t('community.sentimentMeter.title')
              }}
            </p>
            <UBadge
              color="success"
              variant="soft"
              size="xs"
              :label="t('community.sentimentMeter.greed')"
            />
          </div>
          <div class="flex items-end gap-2 mb-3">
            <span class="text-3xl font-black text-success">65</span>
            <span class="text-xs text-muted mb-1">/ 100</span>
          </div>
          <div class="relative h-2 rounded-full overflow-visible mb-3">
            <div class="absolute inset-0 rounded-full bg-linear-to-r from-red-500 via-yellow-400 to-emerald-500" />
            <div
              class="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-success rounded-full shadow-md transition-all duration-500"
              :style="{ left: 'calc(65% - 6px)' }"
            />
          </div>
          <div class="flex justify-between text-[10px] text-muted">
            <span class="flex items-center gap-1">
              <UIcon
                name="i-heroicons-face-frown"
                class="w-3 h-3 text-red-400"
              />
              {{ t('community.sentimentMeter.fear') }}
            </span>
            <span class="text-[10px] text-muted">{{ t('community.sentimentMeter.stats', { count: '1,205' }) }}</span>
            <span class="flex items-center gap-1">
              {{ t('community.sentimentMeter.euphoria') }}
              <UIcon
                name="i-heroicons-face-smile"
                class="w-3 h-3 text-emerald-400"
              />
            </span>
          </div>
        </UCard>

        <!-- Weekly Leaderboard -->
        <UCard :ui="{ body: 'p-0', header: 'px-4 py-3' }">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-trophy"
                class="w-4 h-4 text-primary"
              />
              <p class="text-xs font-semibold uppercase tracking-widest text-muted">
                {{ t('community.leaderboard.title')
                }}
              </p>
            </div>
          </template>
          <div class="divide-y divide-default">
            <UButton
              v-for="(trader, i) in weeklyLeaderboard"
              :key="trader.name"
              variant="ghost"
              color="neutral"
              class="w-full px-4 py-2.5 justify-start gap-3 rounded-none group"
            >
              <span class="text-xs font-black w-4 text-center shrink-0 text-muted">{{ i + 1 }}</span>
              <UUser
                :name="trader.name"
                :description="`${t('community.leaderboard.trades', { count: trader.trades })} · ${trader.pnl}`"
                :avatar="{ src: trader.avatar, size: 'xs' }"
                class="flex-1 min-w-0"
                :ui="{ name: 'text-xs font-semibold group-hover:text-primary transition-colors', description: 'text-[10px]' }"
              />
              <UBadge
                color="success"
                variant="soft"
                size="xs"
                :label="`${trader.winRate}%`"
              />
            </UButton>
          </div>
        </UCard>
      </div>

      <!-- ── COL CENTER ── -->
      <div
        class="flex flex-col min-h-0 overflow-y-auto scrollbar-hide bg-elevated/30 fade-in-up"
        style="animation-delay: 100ms"
      >
        <!-- Create Post -->
        <div
          ref="postBoxRef"
          class="shrink-0 border-b border-default bg-default"
        >
          <div class="p-4">
            <UCard :ui="{ root: 'shadow-sm overflow-visible', body: 'p-4', footer: 'px-4 py-2.5' }">
              <!-- Avatar + Textarea -->
              <div class="flex items-start gap-3">
                <UAvatar
                  :src="user?.avatar ?? undefined"
                  :alt="user?.fullname"
                  size="md"
                  class="shrink-0 mt-0.5"
                />
                <div class="flex-1 min-w-0 relative z-50">
                  <UTextarea
                    v-model="postContent"
                    :rows="3"
                    autoresize
                    variant="none"
                    :padded="false"
                    :placeholder="t('community.post.placeholder')"
                    class="w-full text-sm text-default"
                  />

                  <!-- Coin Dropdown -->
                  <Transition
                    enter-active-class="transition duration-150 ease-out"
                    enter-from-class="opacity-0 translate-y-1"
                    enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition duration-100 ease-in"
                    leave-from-class="opacity-100 translate-y-0"
                    leave-to-class="opacity-0 translate-y-1"
                  >
                    <UCard
                      v-if="showCoinDropdown"
                      class="absolute top-full left-0 mt-1 w-64 z-9999"
                      :ui="{ root: 'shadow-xl', body: 'p-0' }"
                    >
                      <div class="px-3 py-1.5 border-b border-default">
                        <p class="text-[10px] font-bold text-muted uppercase tracking-wider">
                          {{
                            t('community.post.selectCoin') }}
                        </p>
                      </div>
                      <div class="max-h-48 overflow-y-auto scrollbar-hide divide-y divide-default">
                        <UButton
                          v-for="coin in filteredCoinsForDropdown"
                          :key="coin.symbol"
                          variant="ghost"
                          color="neutral"
                          class="w-full justify-between px-3 py-2 rounded-none"
                          @click="selectDropdownCoin(coin)"
                        >
                          <span class="text-xs font-bold">{{ coin.symbol }}</span>
                          <span class="text-[10px] font-mono text-muted">
                            {{ coin.price ? coin.price.toFixed(2) : '--' }}
                          </span>
                        </UButton>
                        <div
                          v-if="!filteredCoinsForDropdown.length"
                          class="py-4 text-center text-xs text-muted"
                        >
                          {{ t('community.post.noResults') }}
                        </div>
                      </div>
                    </UCard>
                  </Transition>
                </div>
              </div>

              <!-- Image Preview -->
              <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
              >
                <div
                  v-if="preViewImage"
                  class="mt-3 ml-11 relative inline-block"
                >
                  <img
                    :src="preViewImage"
                    class="h-32 rounded-xl object-cover ring-1 ring-default shadow-sm"
                  >
                  <UButton
                    icon="i-heroicons-x-mark"
                    size="xs"
                    color="error"
                    variant="solid"
                    class="absolute -top-1.5 -right-1.5 rounded-full shadow"
                    @click="removeSelectedImage"
                  />
                </div>
              </Transition>

              <!-- Toolbar -->
              <template #footer>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-0.5 -ml-1.5">
                    <div class="relative">
                      <input
                        type="file"
                        accept="image/*"
                        class="absolute inset-0 opacity-0 cursor-pointer z-10"
                        @change="handleFileSelect"
                      >
                      <UTooltip :text="t('community.toolbar.addImage')">
                        <UButton
                          icon="i-heroicons-photo"
                          size="xs"
                          variant="ghost"
                          color="neutral"
                          class="pointer-events-none"
                        />
                      </UTooltip>
                    </div>
                    <UTooltip :text="t('community.toolbar.chart')">
                      <UButton
                        icon="i-heroicons-chart-bar"
                        size="xs"
                        variant="ghost"
                        color="neutral"
                      />
                    </UTooltip>
                    <UPopover>
                      <UTooltip :text="t('community.toolbar.emoji')">
                        <UButton
                          icon="i-heroicons-face-smile"
                          size="xs"
                          variant="ghost"
                          color="neutral"
                        />
                      </UTooltip>
                      <template #content>
                        <div class="p-1">
                          <ClientOnly>
                            <EmojiPicker @select="onSelectEmoji" />

                            <!-- Hiệu ứng loading nhẹ trong lúc đợi render ở Client -->
                            <template #fallback>
                              <div
                                class="w-full h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <UIcon
                                  name="i-heroicons-arrow-path"
                                  class="w-6 h-6 animate-spin text-gray-400"
                                />
                              </div>
                            </template>
                          </ClientOnly>
                        </div>
                      </template>
                    </UPopover>
                    <UTooltip :text="t('community.toolbar.hashtag')">
                      <UButton
                        icon="i-heroicons-hashtag"
                        size="xs"
                        variant="ghost"
                        color="neutral"
                      />
                    </UTooltip>
                  </div>
                  <div class="flex items-center gap-2">
                    <USelectMenu
                      v-model="selectedSentiment"
                      value-key="value"
                      size="xs"
                      :placeholder="t('community.post.viewpoint')"
                      :items="sentimentItems"
                      class="w-28"
                    />
                    <UButton
                      :loading="isPosting"
                      size="xs"
                      color="primary"
                      :label="t('community.post.submit')"
                      icon="i-heroicons-paper-airplane"
                      @click="handleCreatePost"
                    />
                  </div>
                </div>
              </template>
            </UCard>
          </div>
        </div>

        <!-- Feed Tabs -->
        <div class="shrink-0 bg-default border-b border-default px-4">
          <UTabs
            v-model="feedTab"
            :items="feedTabs"
            variant="link"
            color="primary"
            :content="false"
            :ui="{ list: 'gap-4', trigger: 'text-sm font-medium py-3' }"
          />
        </div>

        <!-- Post Feed -->
        <div class="flex-1">
          <div class="p-4 space-y-3 mx-auto w-full">
            <PostCard
              v-for="post in posts"
              :key="post.id"
              :post="post"
              @like="toggleLike"
              @delete="openDeleteConfirm"
              @share="handleShare"
            />
            <UEmpty
              v-if="!loading && !posts.length"
              icon="i-heroicons-newspaper"
              :title="t('community.feed.emptyTitle')"
              :description="t('community.feed.emptyDescription')"
              class="py-16"
            />
            <div
              v-if="posts.length"
              class="py-4 text-center"
            >
              <UButton
                variant="ghost"
                color="neutral"
                size="sm"
                :label="t('community.feed.loadMore')"
                trailing-icon="i-heroicons-chevron-down"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ── COL RIGHT ── -->
      <div
        class="hidden xl:flex flex-col min-h-0 gap-3 p-3 overflow-y-auto border-l border-default bg-default scrollbar-hide fade-in-up"
        style="animation-delay: 200ms"
      >
        <!-- Trending Markets -->
        <UCard :ui="{ body: 'p-0 max-h-[300px] overflow-y-auto scrollbar-hide', header: 'px-4 py-3' }">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-heroicons-arrow-trending-up"
                  class="w-4 h-4 text-primary"
                />
                <p class="text-xs font-semibold uppercase tracking-widest text-muted">
                  {{ t('community.trending.title')
                  }}
                </p>
              </div>
              <UButton
                variant="link"
                color="primary"
                size="xs"
                :label="t('community.trending.all')"
                @click="switchTag('ALL')"
              />
            </div>
          </template>
          <UTable
            :data="trendingStocks"
            :columns="trendingColumns"
            :loading="!trendingStocks.length"
            :ui="{
              th: 'text-[10px] font-semibold uppercase tracking-wide text-muted px-4 py-2',
              td: 'px-4 py-2.5',
              tr: 'hover:bg-elevated transition-colors cursor-pointer'
            }"
            @select="(_, row) => switchTag(row.original.symbol)"
          >
            <template #empty>
              <p class="py-6 text-center text-xs text-muted">
                {{ t('community.trending.empty') }}
              </p>
            </template>
          </UTable>
        </UCard>

        <!-- Recent Activity -->
        <UCard :ui="{ body: 'p-0', header: 'px-4 py-3' }">
          <template #header>
            <div class="flex items-center gap-2">
              <UChip
                color="success"
                :show="true"
                size="sm"
                standalone
              >
                <UIcon
                  name="i-heroicons-bolt"
                  class="w-4 h-4 text-muted"
                />
              </UChip>
              <p class="text-xs font-semibold uppercase tracking-widest text-muted">
                {{ t('community.activity.title') }}
              </p>
            </div>
          </template>
          <div class="divide-y divide-default">
            <div
              v-for="act in recentActivities"
              :key="act.id"
              class="px-4 py-2.5 hover:bg-elevated transition-colors"
            >
              <UUser
                :name="act.user"
                :description="`${act.action} · ${act.time}`"
                :avatar="{ alt: act.user, size: 'xs' }"
                :ui="{ name: 'text-xs font-semibold', description: 'text-[10px] text-muted' }"
              />
            </div>
          </div>
        </UCard>

        <!-- Announcements -->
        <UCard :ui="{ body: 'p-0', header: 'px-4 py-3' }">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-4 h-4 text-warning"
              />
              <p class="text-xs font-semibold uppercase tracking-widest text-muted">
                {{
                  t('community.announcements.title') }}
              </p>
            </div>
          </template>
          <div class="divide-y divide-default">
            <div
              v-for="ann in announcements"
              :key="ann.id"
              class="px-4 py-3 hover:bg-elevated cursor-pointer transition-colors group"
            >
              <div class="flex items-center gap-2 mb-1.5">
                <UBadge
                  :color="ann.type === 'warning' ? 'warning' : ann.type === 'event' ? 'info' : 'success'"
                  variant="subtle"
                  size="xs"
                  :label="ann.badge"
                />
                <span class="text-[10px] text-muted">{{ ann.time }}</span>
              </div>
              <p class="text-xs text-default leading-snug group-hover:text-primary transition-colors">
                {{ ann.text }}
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <ConfirmModal
      v-model:open="isConfigModalOpen"
      :title="t('community.deleteModal.title')"
      :description="t('community.deleteModal.description')"
      :confirm-text="t('community.deleteModal.confirm')"
      :cancel-text="t('community.deleteModal.cancel')"
      confirm-color="error"
      @confirm="excuteDeletePost"
    />
  </UDashboardPanel>
</template>

<script lang="ts" setup>
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import ConfirmModal from '~/components/ui/confirm-modal.vue'
import PostCard from '~/components/community/post-card.vue'

const EmojiPicker = defineAsyncComponent(() =>
  import('vue3-emoji-picker').then(m => m.default)
)

const { t } = useI18n()
const toast = useToast()
const { user } = useAuth()

// Danh sách coin lấy từ DB (sync Binance 30s qua priceSync plugin) — thay cho store cũ
const catalog = useCoinCatalog()
catalog.limit.value = 200

const feedTab = ref('for-you')
const feedTabs = computed(() => [
  { label: t('community.tabs.forYou'), value: 'for-you' },
  { label: t('community.tabs.following'), value: 'following' },
  { label: t('community.tabs.signals'), value: 'signals' }
])

const userStats = computed(() => [
  { value: '24', label: t('community.userStats.posts') },
  { value: '1.2k', label: t('community.userStats.followers') },
  { value: '89%', label: t('community.userStats.accuracy') }
])

// Quan điểm cho USelectMenu: value cố định (bull/bear/neutral), label dịch theo ngôn ngữ
const sentimentItems = computed(() => [
  { label: t('community.sentiment.bull'), value: 'bull' },
  { label: t('community.sentiment.bear'), value: 'bear' },
  { label: t('community.sentiment.neutral'), value: 'neutral' }
])

const {
  posts, trending, loading, isPosting,
  fetchPosts, fetchTrending, switchTag, createPost, toggleLike, deletePost
} = usePosts()

const postContent = ref('')
const selectedSentiment = ref('')
const selectedFile = ref<File | null>(null)
const preViewImage = ref<string | null>(null)
const postBoxRef = ref<HTMLElement | null>(null)

const isConfigModalOpen = ref(false)
const postIdToDelete = ref<number | null>(null)
const openDeleteConfirm = (id: number) => {
  postIdToDelete.value = id
  isConfigModalOpen.value = true
}

// vue3-emoji-picker: field `i` là ký tự emoji đã chọn
const onSelectEmoji = (emoji: { i: string }) => {
  postContent.value += emoji.i
}
const focusPost = () => postBoxRef.value?.scrollIntoView({ behavior: 'smooth' })
const removeSelectedImage = () => {
  selectedFile.value = null
  preViewImage.value = null
}

const showCoinDropdown = ref(false)
const coinSearchQuery = ref('')

watch(postContent, (newVal) => {
  const match = newVal.match(/(?:\s|^)\$([a-zA-Z0-9]*)$/)
  if (match) {
    showCoinDropdown.value = true
    coinSearchQuery.value = match[1]!.toUpperCase()
  } else {
    showCoinDropdown.value = false
  }
})

const filteredCoinsForDropdown = computed(() => {
  // catalog.items đã trả symbol gọn ('BTC') và price là number
  const allCoins = catalog.items.value.map(c => ({
    symbol: c.symbol,
    price: c.price
  }))
  if (!coinSearchQuery.value) return allCoins.slice(0, 5)
  return allCoins.filter(c => c.symbol.includes(coinSearchQuery.value)).slice(0, 5)
})

const selectDropdownCoin = (coin: { symbol: string }) => {
  postContent.value = postContent.value.replace(/(?:\s|^)\$([a-zA-Z0-9]*)$/, ` $${coin.symbol} `)
  showCoinDropdown.value = false
}

const handleFileSelect = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) {
    selectedFile.value = f
    preViewImage.value = URL.createObjectURL(f)
  }
}

const handleCreatePost = async () => {
  const sentiment = selectedSentiment.value
  if (!postContent.value.trim() || !sentiment) {
    toast.add({ title: t('community.toast.contentRequired'), color: 'error', duration: 1500 })
    return
  }
  const ok = await createPost(postContent.value, sentiment, selectedFile.value)
  if (ok) {
    postContent.value = ''
    selectedSentiment.value = ''
    removeSelectedImage()
    toast.add({ title: t('community.toast.posted'), color: 'success', duration: 1500 })
  } else {
    toast.add({ title: t('community.toast.postError'), color: 'error', duration: 1500 })
  }
}

const excuteDeletePost = async () => {
  if (!postIdToDelete.value) return
  try {
    await deletePost(postIdToDelete.value)
    isConfigModalOpen.value = false
    toast.add({ title: t('community.toast.deleted'), description: t('community.toast.deletedDesc'), color: 'success', duration: 1500 })
  } catch {
    toast.add({ title: t('community.toast.deleteFailed'), description: t('community.toast.deleteFailedDesc'), color: 'error', duration: 1500 })
  } finally {
    postIdToDelete.value = null
  }
}

const handleShare = async (post: { id: number }) => {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`)
    toast.add({ title: t('community.toast.linkCopied'), color: 'success', duration: 1500 })
  } catch {
    toast.add({ title: t('community.toast.shareError'), color: 'error', duration: 1500 })
  }
}

const trendingStocks = computed(() => {
  return trending.value.map((t) => {
    const coin = catalog.items.value.find(c => c.symbol === t.symbol)
    return {
      symbol: t.symbol,
      posts: t.post_count,
      price: coin?.price ?? 0,
      change: coin?.changePercent24h ?? 0,
      // Icon từ DB (CoinGecko seed); rỗng nếu coin không có trong catalog
      icon: coin?.icon ?? ''
    }
  })
})

type TrendingRow = (typeof trendingStocks.value)[number]

const trendingColumns = computed<TableColumn<TrendingRow>[]>(() => [
  {
    accessorKey: 'symbol',
    header: t('community.trending.colName'),
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
      h('img', { src: row.original.icon, alt: row.original.symbol, class: 'w-7 h-7 rounded-full bg-default shrink-0' }),
      h('div', { class: 'flex-1 min-w-0' }, [
        h('p', { class: 'text-xs font-semibold text-default tabular-nums' }, row.original.symbol),
        h('p', { class: 'text-[10px] text-muted' }, t('community.trending.postCount', { count: row.original.posts }))
      ])
    ])
  },
  {
    accessorKey: 'price',
    header: () => h('span', { class: 'block text-right' }, t('community.trending.colPrice')),
    cell: ({ row }) => h('p', { class: 'text-xs font-semibold text-right tabular-nums' },
      row.original.price ? `$${formatPrice(row.original.price)}` : '--')
  },
  {
    accessorKey: 'change',
    header: () => h('span', { class: 'block text-right' }, t('community.trending.colChange')),
    cell: ({ row }) => {
      const c = row.original.change
      return h('p', {
        class: `text-[11px] font-semibold text-right tabular-nums ${c >= 0 ? 'text-success' : 'text-error'}`
      }, formatChange(c ?? 0))
    }
  }
])

const weeklyLeaderboard = [
  { name: 'CryptoWhale', avatar: 'https://i.pravatar.cc/150?img=33', trades: 47, winRate: 92, pnl: '+$12.4K' },
  { name: 'SatoshiFan', avatar: 'https://i.pravatar.cc/150?img=44', trades: 35, winRate: 87, pnl: '+$8.1K' },
  { name: 'DeFiHunter', avatar: 'https://i.pravatar.cc/150?img=22', trades: 52, winRate: 81, pnl: '+$6.7K' }
]
const recentActivities = computed(() => [
  { id: 1, user: 'CryptoWhale', action: t('community.activity.openedLongBtc'), time: t('community.time.minutesAgo', { n: 2 }) },
  { id: 2, user: 'SatoshiFan', action: t('community.activity.commentedEth'), time: t('community.time.minutesAgo', { n: 5 }) },
  { id: 3, user: 'DeFiHunter', action: t('community.activity.winStreak'), time: t('community.time.minutesAgo', { n: 12 }) }
])
const announcements = computed(() => [
  { id: 1, type: 'warning', badge: t('community.announcements.warningBadge'), text: t('community.announcements.fomc'), time: t('community.time.hoursAgo', { n: 1 }) },
  { id: 2, type: 'event', badge: t('community.announcements.eventBadge'), text: t('community.announcements.contest'), time: t('community.time.hoursAgo', { n: 3 }) }
])

onMounted(() => {
  fetchPosts()
  fetchTrending()
  catalog.load()
})
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
}
</style>
