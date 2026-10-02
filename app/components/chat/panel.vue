<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- ══ TRẠNG THÁI 1: Chưa có chat active ══ -->
    <template v-if="!activeId">
      <UContainer class="flex-1 flex flex-col justify-center gap-6 py-8 h-full">
        <h2 class="text-2xl font-bold text-highlighted">
          {{ greeting }}
        </h2>

        <div class="w-full shrink-0">
          <UChatPrompt
            v-model="input"
            :disabled="creating"
            :maxrows="6"
            placeholder="Hỏi bất cứ điều gì về crypto..."
            variant="subtle"
            @submit="onSubmit"
          >
            <template #footer>
              <ChatModalSelect />
              <UButton
                type="submit"
                icon="i-lucide-arrow-up"
                color="neutral"
                size="sm"
                :disabled="creating"
              />
            </template>
          </UChatPrompt>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="q in quickChats"
            :key="q.label"
            :icon="q.icon"
            :label="q.label"
            size="xs"
            color="neutral"
            variant="outline"
            class="rounded-full"
            :disabled="creating"
            @click="startChat(q.label)"
          />
        </div>
      </UContainer>
    </template>

    <!-- ══ TRẠNG THÁI 2: Đang chat → khung chat DÙNG CHUNG với full page ══ -->
    <!-- :key buộc Vue remount FRESH khi đổi chat-id (switch user / mở chat khác) -->
    <ChatThread
      v-else
      :key="activeId ?? 'none'"
      variant="panel"
      :chat-id="activeId"
    />
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth()
const toast = useToast()

// Nguồn sự thật chung — đồng bộ với full page + sống qua F5
const { activeId, createChat, newChat } = useChatSession()

const input = ref('')
const creating = ref(false)

// ── GREETING ──────────────────────────────────────────────────
const greeting = computed(() => {
  const hour = new Date().getHours()
  const g = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
  const name = user.value?.fullname?.split(' ').at(-1)
  return name ? `${g}, ${name}` : g
})

const quickChats = [
  { label: 'BTC có nên mua thêm không?', icon: 'i-lucide-bitcoin' },
  { label: 'Giải thích DCA là gì?', icon: 'i-lucide-repeat' },
  { label: 'Rủi ro khi đầu tư altcoin?', icon: 'i-lucide-alert-triangle' },
  { label: 'Xu hướng thị trường tuần này', icon: 'i-lucide-line-chart' }
] as const

// ── TẠO CHAT (không điều hướng) ───────────────────────────────
async function startChat(text: string) {
  const t = text.trim()
  if (!t || creating.value || activeId.value) return
  creating.value = true
  try {
    // tạo chat + set activeId + pending → ChatThread (state 2) tự gửi tin đầu
    await createChat(t)
  } catch {
    toast.add({
      description: 'Không tạo được cuộc trò chuyện, thử lại nhé!',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}

function onSubmit() {
  if (!input.value.trim()) return
  startChat(input.value)
  input.value = ''
}

// Nút "Chat mới" ở header panel (layout default gọi)
function handleNewChat() {
  newChat()
  input.value = ''
}
defineExpose({ handleNewChat })
</script>
