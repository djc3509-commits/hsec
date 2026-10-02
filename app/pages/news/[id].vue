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

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const id = computed(() => Number(route.params.id))

// ── Fetch bài viết ─────────────────────────────────────
const { data, pending, error } = await useFetch<{ data?: { article?: NewsItem } }>(`/api/news/${id.value}`)
const article = computed<NewsItem | null>(() => data.value?.data?.article ?? null)

// ── SEO ────────────────────────────────────────────────
useSeoMeta({
  title: () => article.value?.title ?? t('news.navbar.title'),
  description: () => article.value?.summary ?? '',
  ogTitle: () => article.value?.title ?? '',
  ogDescription: () => article.value?.summary ?? '',
  ogImage: () => article.value?.image ?? ''
})

// ── Like (local) ───────────────────────────────────────
const isLiked = ref(false)
function toggleLike() {
  isLiked.value = !isLiked.value
}

// ── Copy link ──────────────────────────────────────────
async function copyLink() {
  await navigator.clipboard.writeText(window.location.href)
  toast.add({ title: 'Đã sao chép link!', color: 'success', duration: 2000 })
}

// ── Tags & colours ─────────────────────────────────────
const tagMap: Record<string, string[]> = {
  bitcoin: ['#Bitcoin', '#BTC', '#CryptoMarket'],
  altcoin: ['#Altcoin', '#Crypto', '#DeFi'],
  defi: ['#DeFi', '#Web3', '#Protocol'],
  nft: ['#NFT', '#Web3', '#Digital'],
  macro: ['#Macro', '#Economy', '#Finance'],
  regulation: ['#Regulation', '#Law', '#Policy']
}
const articleTags = computed(() =>
  tagMap[article.value?.category ?? ''] ?? ['#Crypto', '#Blockchain']
)

const categoryColors: Record<string, 'info' | 'warning' | 'secondary' | 'success' | 'error' | 'neutral' | 'primary'> = {
  macro: 'info',
  bitcoin: 'warning',
  altcoin: 'secondary',
  defi: 'success',
  nft: 'error',
  regulation: 'error'
}
const categoryLabels: Record<string, string> = {
  macro: 'Vĩ mô', bitcoin: 'Bitcoin', altcoin: 'Altcoin',
  defi: 'DeFi', nft: 'NFT', regulation: 'Pháp lý'
}
</script>

<template>
  <UDashboardPanel class="flex flex-col h-screen overflow-hidden">
    <!-- Navbar -->
    <UDashboardNavbar :title="t('news.navbar.title')">
      <template #leading>
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          square
          @click="router.back()"
        />
      </template>
      <template #right>
        <UButton
          icon="i-heroicons-bookmark"
          color="neutral"
          variant="ghost"
          size="sm"
          square
        />
        <UButton
          icon="i-heroicons-share"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          @click="copyLink"
        />
        <UButton
          v-if="article?.sourceUrl"
          :href="article.sourceUrl"
          target="_blank"
          label="Đọc bản gốc"
          color="success"
          variant="soft"
          size="xs"
          trailing-icon="i-lucide-arrow-up-right"
        />
      </template>
    </UDashboardNavbar>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto min-h-0 bg-default">
      <!-- Loading -->
      <div
        v-if="pending"
        class="h-80 flex items-center justify-center"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-8 h-8 animate-spin text-primary"
        />
      </div>

      <!-- Error -->
      <div
        v-else-if="error || !article"
        class="py-20 text-center text-muted"
      >
        <UIcon
          name="i-lucide-newspaper"
          class="w-12 h-12 mx-auto mb-3 opacity-30"
        />
        <p class="font-medium">
          Không tìm thấy bài viết
        </p>
        <UButton
          label="Quay lại"
          variant="link"
          color="neutral"
          class="mt-3"
          @click="router.back()"
        />
      </div>

      <!-- Content -->
      <div
        v-else
        class="max-w-4xl mx-auto px-4 lg:px-6 pb-16 pt-4"
      >
        <!-- Hero image -->
        <div class="relative h-64 sm:h-96 overflow-hidden rounded-2xl mb-8">
          <img
            :src="article.image"
            :alt="article.title"
            class="w-full h-full object-cover"
            @error="($event.target as HTMLImageElement).src = 'https://placehold.co/800x400?text=Crypto+News'"
          >
          <div class="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
          <div class="absolute bottom-4 left-4">
            <UBadge
              :label="categoryLabels[article.category] ?? article.category"
              :color="categoryColors[article.category] ?? 'neutral'"
              variant="solid"
              size="xs"
              :ui="{ base: 'uppercase tracking-widest font-black' }"
            />
          </div>
        </div>

        <!-- Meta -->
        <div class="flex items-center gap-3 text-xs text-muted mb-4 flex-wrap">
          <span class="text-primary font-bold">{{ article.source }}</span>
          <USeparator
            orientation="vertical"
            class="h-3"
            decorative
          />
          <span class="flex items-center gap-1">
            <UIcon
              name="i-lucide-clock"
              class="w-3 h-3"
            />
            {{ article.timeAgo }}
          </span>
          <USeparator
            orientation="vertical"
            class="h-3"
            decorative
          />
          <span class="flex items-center gap-1">
            <UIcon
              name="i-heroicons-eye"
              class="w-3 h-3"
            />
            {{ article.views?.toLocaleString() }}
          </span>
        </div>

        <!-- Title -->
        <h1 class="text-2xl sm:text-3xl font-bold text-highlighted leading-tight mb-6">
          {{ article.title }}
        </h1>

        <!-- Summary blockquote -->
        <div class="relative pl-5 py-1 mb-8">
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-success rounded-full" />
          <p class="text-muted italic text-base leading-relaxed">
            {{ article.summary }}
          </p>
        </div>

        <!-- Content -->
        <!-- Nội dung bài là HTML do admin soạn, lưu trong DB → cần render HTML -->
        <!-- eslint-disable vue/no-v-html -->
        <div
          v-if="article.content"
          class="prose prose-sm dark:prose-invert max-w-none text-muted leading-7 space-y-5"
          v-html="article.content"
        />
        <!-- eslint-enable vue/no-v-html -->

        <!-- Tags + Actions -->
        <USeparator
          class="mt-10 mb-6"
          decorative
        />

        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="tag in articleTags"
              :key="tag"
              :label="tag"
              color="neutral"
              variant="subtle"
              size="sm"
              class="cursor-pointer hover:opacity-80 transition-opacity"
            />
          </div>

          <div class="flex items-center gap-3">
            <UButton
              :icon="isLiked ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
              :color="isLiked ? 'error' : 'neutral'"
              variant="ghost"
              size="sm"
              :label="String((article.likes ?? 0) + (isLiked ? 1 : 0))"
              :ui="{ base: 'transition-transform active:scale-125' }"
              @click="toggleLike"
            />
          </div>
        </div>
      </div>
    </div>
  </UDashboardPanel>
</template>
