<script setup lang="ts">
// KHUNG CHAT DÙNG CHUNG cho panel ↔ full page.
// Gom toàn bộ: tạo/khôi phục Chat instance theo chatId, gửi tin, status (khử race scroll),
// gửi tin nhắn đầu (pending) của chat mới. Mỗi view chỉ cần truyền :chat-id.
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import type { ChatDetailResponse } from '../../../server/dtos/chat'

const props = withDefaults(defineProps<{
  chatId: string
  variant?: 'full' | 'panel'
  // SSR cấp sẵn (full page) → không cần fetch lại; panel bỏ trống → tự fetch DB.
  initialMessages?: UIMessage[]
}>(), { variant: 'full' })

const emit = defineEmits<{ finish: [] }>()

const { model } = useModels()
const { takePending } = useChatSession()
const toast = useToast()

const input = ref('')
const chat = shallowRef<Chat<UIMessage> | null>(null)
const loadedId = ref<string | null>(null)

// Ổn định status để khử race "lúc cuộn lúc không" của UChatMessages
const { status: chatStatus, markSubmitted } = useStableStatus(() => chat.value?.status)

function buildChat(id: string, messages: UIMessage[]) {
  return new Chat<UIMessage>({
    id,
    messages,
    transport: new DefaultChatTransport({
      api: '/api/chat/stream',
      prepareSendMessagesRequest({ id, messages }) {
        return { body: { id, messages, model: model.value } }
      }
    }),
    onFinish() {
      refreshNuxtData('chat-sessions') // cập nhật sidebar (title mới)
      emit('finish') // báo cha (full page refresh title)
    },
    onError(error) {
      let message = error.message
      if (typeof message === 'string' && message[0] === '{') {
        try {
          message = JSON.parse(message).message || message
        } catch { /* giữ message gốc */ }
      }
      toast.add({ description: message, icon: 'i-lucide-alert-circle', color: 'error', duration: 5000 })
    }
  })
}

// Tải/khởi tạo Chat theo chatId (đổi id hoặc mount).
async function ensureChat(id: string) {
  if (!id || (loadedId.value === id && chat.value)) return
  let messages: UIMessage[] = props.initialMessages ?? []
  if (!props.initialMessages) {
    try {
      const data = await $fetch<ChatDetailResponse>('/api/chat/history', { query: { chatId: id } })
      messages = (data?.messages ?? []).map(m => ({
        id: String(m.id),
        role: m.role,
        parts: [{ type: 'text' as const, text: m.content }]
      })) as UIMessage[]
    } catch {
      messages = []
    }
  }
  const c = buildChat(id, messages)
  chat.value = c
  loadedId.value = id
  // Gửi tin nhắn đầu nếu là chat vừa tạo (pending từ session)
  const first = takePending(id)
  if (first) {
    c.sendMessage({ text: first })
    markSubmitted()
  }
}

watch(() => props.chatId, id => ensureChat(id), { immediate: true })

function onSubmit() {
  const c = chat.value
  const t = input.value.trim()
  if (!t || !c) return
  if (c.status === 'streaming' || c.status === 'submitted') return
  c.sendMessage({ text: t })
  markSubmitted()
  input.value = ''
}
</script>

<template>
  <!-- ═══ FULL: trang chat đầy đủ (cuộn nhờ body của UDashboardPanel) ═══ -->
  <div
    v-if="variant === 'full'"
    class="flex flex-1"
  >
    <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6">
      <UChatMessages
        v-if="chat"
        should-auto-scroll
        :messages="chat.messages"
        :status="chatStatus"
        :spacing-offset="160"
        class="pt-(--ui-header-height) pb-4 sm:pb-6"
      >
        <template #indicator>
          <div class="flex items-center gap-1.5">
            <ChatIndicator />
            <UChatShimmer
              text="Đang suy nghĩ..."
              class="text-sm"
            />
          </div>
        </template>
        <template #content="{ message }">
          <ChatMessageContent :message="message" />
        </template>
        <template #actions="{ message }">
          <ChatMessageActions
            :message="message"
            :streaming="chat.status === 'streaming' && message.id === chat.messages[chat.messages.length - 1]?.id"
          />
        </template>
      </UChatMessages>

      <UChatPrompt
        v-model="input"
        :error="chat?.error"
        placeholder="Nhập tin nhắn..."
        :maxrows="6"
        variant="subtle"
        class="sticky bottom-0 [view-transition-name:chat-prompt] rounded-b-none z-10"
        :ui="{ base: 'px-1.5' }"
        @submit="onSubmit"
      >
        <template #footer>
          <div class="flex items-center gap-1">
            <ChatModalSelect />
          </div>
          <UChatPromptSubmit
            :status="chat?.status"
            color="neutral"
            size="sm"
            @stop="chat?.stop()"
            @reload="chat?.regenerate()"
          />
        </template>
      </UChatPrompt>
    </UContainer>
  </div>

  <!-- ═══ PANEL: khung chat nhỏ ở dashboard (div cuộn riêng, ổn định) ═══ -->
  <div
    v-else
    class="flex flex-col h-full min-h-0"
  >
    <div class="chat-scroll flex-1 overflow-y-auto min-h-0 px-4 py-4">
      <UChatMessages
        v-if="chat"
        should-auto-scroll
        :messages="chat.messages"
        :status="chatStatus"
        :spacing-offset="0"
      >
        <template #indicator>
          <div class="flex items-center gap-1.5">
            <ChatIndicator />
            <UChatShimmer
              text="Đang suy nghĩ..."
              class="text-sm"
            />
          </div>
        </template>
        <template #content="{ message }">
          <ChatMessageContent :message="message" />
        </template>
        <template #actions="{ message }">
          <ChatMessageActions
            :message="message"
            :streaming="chat.status === 'streaming' && message.id === chat.messages[chat.messages.length - 1]?.id"
          />
        </template>
      </UChatMessages>
    </div>

    <div class="shrink-0 px-4 pb-3 pt-1 border-t border-default">
      <UChatPrompt
        v-model="input"
        :error="chat?.error"
        :maxrows="6"
        placeholder="Nhập tin nhắn..."
        variant="subtle"
        @submit="onSubmit"
      >
        <template #footer>
          <ChatModalSelect />
          <UChatPromptSubmit
            :status="chat?.status"
            color="neutral"
            size="sm"
            @stop="chat?.stop()"
          />
        </template>
      </UChatPrompt>
    </div>
  </div>
</template>

<style scoped>
/* Hiệu ứng xuất hiện mượt cho từng tin nhắn (panel) */
.chat-scroll :deep(article) {
  animation: msg-appear 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes msg-appear {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .chat-scroll :deep(article) { animation: none; }
}
</style>
