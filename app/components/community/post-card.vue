<template>
  <UCard
    :ui="{ body: 'p-4', footer: 'px-4 py-2.5' }"
    class="hover:shadow-sm transition-shadow duration-200"
  >
    <!-- ── Header ── -->
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="relative shrink-0">
          <UAvatar
            :src="post.avatar"
            :alt="post.user"
            size="sm"
          />
          <UIcon
            v-if="post.isExpert"
            name="i-heroicons-check-badge-solid"
            class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-primary bg-white rounded-full"
          />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-semibold text-sm hover:text-primary cursor-pointer transition-colors">
              {{ post.user }}
            </span>
            <UBadge
              v-if="post.isExpert"
              color="primary"
              variant="soft"
              size="xs"
              label="PRO"
            />
            <span class="text-xs text-muted">· {{ formatTimeAgo(post.time) }}</span>
          </div>
          <p class="text-xs text-muted">
            {{ t('community.activeMember') }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <UBadge
          :color="sentimentColor"
          variant="subtle"
          size="xs"
          :icon="sentimentIcon"
          :label="sentimentLabel"
        />
        <UDropdownMenu
          :items="[[{ label: t('community.post.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => emit('delete', post.id) }]]"
          :content="{ align: 'end' }"
        >
          <UButton
            icon="i-lucide-ellipsis-vertical"
            variant="ghost"
            color="neutral"
            size="xs"
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- ── Content ── -->
    <p class="text-sm break-all text-default leading-relaxed whitespace-pre-line mt-3">
      {{ post.content }}
    </p>

    <!-- ── Tags ── -->
    <div
      v-if="post.tags?.length"
      class="flex flex-wrap gap-1 mt-2.5"
    >
      <UBadge
        v-for="tag in post.tags"
        :key="tag"
        color="primary"
        variant="soft"
        size="xl"
        :label="`$${tag}`"
        class="cursor-pointer"
      />
    </div>

    <!-- ── Image ── -->
    <div
      v-if="post.image"
      class="mt-3 rounded-xl overflow-hidden border border-default cursor-zoom-in"
      @click="lightboxOpen = true"
    >
      <img
        :src="post.image"
        alt=""
        class="w-full object-cover aspect-video hover:scale-105 transition-transform duration-300"
      >
    </div>

    <!-- ── Lightbox ── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="lightboxOpen"
          class="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          @click.self="lightboxOpen = false"
        >
          <Transition
            appear
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-4"
          >
            <img
              v-if="lightboxOpen"
              :src="post.image ?? undefined"
              class="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
            >
          </Transition>
          <UButton
            icon="i-heroicons-x-mark"
            variant="solid"
            color="neutral"
            class="absolute top-4 right-4 rounded-full shadow-lg"
            @click="() => { lightboxOpen = false }"
          />
        </div>
      </Transition>
    </Teleport>
    <!-- ── Actions ── -->
    <template #footer>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-0.5 -ml-1.5">
          <UButton
            :icon="post.isLikedByMe ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
            variant="ghost"
            :color="post.isLikedByMe ? 'error' : 'neutral'"
            size="xs"
            :label="String(post.likes ?? 0)"
            @click="emit('like', post)"
          />
          <UButton
            icon="i-heroicons-chat-bubble-left"
            variant="ghost"
            color="neutral"
            size="xs"
            :label="String(post.comments ?? 0)"
          />
          <UButton
            icon="i-heroicons-arrow-path-rounded-square"
            variant="ghost"
            color="neutral"
            size="xs"
          />
          <UButton
            icon="i-heroicons-share"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="emit('share', post)"
          />
        </div>
        <UButton
          icon="i-heroicons-bookmark"
          variant="ghost"
          color="neutral"
          size="xs"
        />
      </div>
    </template>
  </UCard>
</template>

<script lang="ts" setup>
import type { PostFeedItem } from '../../../server/dtos/posts'

const { t } = useI18n()

const props = defineProps<{ post: PostFeedItem }>()
const lightboxOpen = ref(false)

const emit = defineEmits<{
  like: [post: PostFeedItem]
  delete: [id: number]
  share: [post: PostFeedItem]
}>()

// ── Sentiment helpers ─────────────────────────────────
const sentimentColor = computed(() => ({
  bull: 'success',
  bear: 'error',
  neutral: 'neutral'
} as const)[props.post.sentiment])

const sentimentIcon = computed(() => ({
  bull: 'i-heroicons-arrow-trending-up',
  bear: 'i-heroicons-arrow-trending-down',
  neutral: 'i-heroicons-eye'
} as const)[props.post.sentiment])

const sentimentLabel = computed(() => ({
  bull: t('community.sentiment.bull'),
  bear: t('community.sentiment.bear'),
  neutral: t('community.sentiment.neutral')
})[props.post.sentiment])
</script>

<style scoped>
/* ── Lightbox Animations ── */
.lightbox-enter-active,
.lightbox-leave-active {
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.lightbox-enter-from,
.lightbox-leave-to {
    opacity: 0;
}

.lightbox-enter-active .lightbox-img {
    animation: lightbox-zoom 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.lightbox-leave-active .lightbox-img {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: scale(0.95) translateY(10px);
    opacity: 0;
}

@keyframes lightbox-zoom {
    from {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}
</style>
