<script setup lang="ts">
// Trang chat đầy đủ — chỉ là VỎ: header (title) + <ChatThread> dùng chung.
import type { UIMessage } from 'ai'
import Navbar from '~/components/chat/navbar.vue'
import type { ChatDetailResponse } from '../../../server/dtos/chat'

definePageMeta({
  layout: 'chat',
  // remount khi đổi chatId để ChatThread khởi tạo lại đúng dữ liệu
  key: route => route.params.id as string
})

const route = useRoute()
const chatId = computed(() => route.params.id as string)
const session = useChatSession()

// URL là nguồn chân lý cho full page → đồng bộ con trỏ chung (panel sẽ thấy đúng chat đang xem)
watchEffect(() => {
  if (chatId.value) session.open(chatId.value)
})

// Lấy lịch sử + tiêu đề (SSR) để hiện title ở header + seed cho ChatThread
const { data, refresh, error } = await useFetch<ChatDetailResponse>('/api/chat/history', {
  key: () => `chat-${chatId.value}`,
  query: computed(() => ({ chatId: chatId.value })),
  cache: 'no-cache'
})

// Self-heal: chat không tồn tại / không thuộc user → clear con trỏ + về /chat
watch(error, async (e) => {
  if (e && (e.statusCode === 404 || e.statusCode === 403)) {
    session.clearOnNotFound()
    await navigateTo('/chat', { replace: true })
  }
}, { immediate: true })

const title = ref<string | null>(data.value?.title ?? null)
const isOwner = computed(() => data.value?.isOwner ?? false)
watch(() => data.value?.title, (v) => {
  title.value = v ?? null
})

const initialMessages = computed<UIMessage[]>(() => (data.value?.messages ?? []).map(m => ({
  id: String(m.id),
  role: m.role,
  parts: [{ type: 'text' as const, text: m.content }]
})) as UIMessage[])

// AI trả lời xong → refresh title (chat mới vừa được đặt tên)
function onFinish() {
  refresh()
}
</script>

<template>
  <UDashboardPanel
    id="chat"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <ChatTitle
            :chat-id="data?.id ?? ''"
            :is-owner="isOwner"
            :title="title"
            @update:title="title = $event"
          />
        </template>
      </Navbar>
    </template>

    <template #body>
      <ChatThread
        variant="full"
        :chat-id="chatId"
        :initial-messages="initialMessages"
        @finish="onFinish"
      />
    </template>
  </UDashboardPanel>
</template>
