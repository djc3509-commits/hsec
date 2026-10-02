<script setup lang="ts">
// Trang chat mới — tạo chat rỗng rồi điều hướng sang /chat/[id] (giống template).
import Navbar from '~/components/chat/navbar.vue'

definePageMeta({ layout: 'chat' })

const toast = useToast()
const { user } = useAuth()

const session = useChatSession()
const input = ref('')
const creating = ref(false)

// Vào trang "chat mới" → reset con trỏ chung (để "Chat mới" đồng bộ cả panel)
onMounted(() => session.newChat())

// ── GREETING ──────────────────────────────────────────────────
const greeting = computed(() => {
  const hour = new Date().getHours()
  let timeGreeting = 'Chào buổi tối'
  if (hour < 12) timeGreeting = 'Chào buổi sáng'
  else if (hour < 18) timeGreeting = 'Chào buổi chiều'
  const name = user.value?.fullname?.split(' ').at(-1)
  return name ? `${timeGreeting}, ${name}` : timeGreeting
})

// ── QUICK PROMPTS ─────────────────────────────────────────────
const quickChats = [
  { label: 'BTC có nên mua thêm không?', icon: 'i-lucide-bitcoin' },
  { label: 'Giải thích DCA là gì?', icon: 'i-lucide-repeat' },
  { label: 'Rủi ro khi đầu tư altcoin?', icon: 'i-lucide-alert-triangle' },
  { label: 'Xu hướng thị trường tuần này', icon: 'i-lucide-line-chart' }
] as const

// ── ACTIONS ───────────────────────────────────────────────────
async function createChat(prompt: string) {
  if (!prompt.trim() || creating.value) return
  creating.value = true
  try {
    // tạo chat + set activeId + lưu tin đầu (ChatThread sẽ gửi khi /chat/[id] mở)
    const id = await session.createChat(prompt.trim())
    await navigateTo(`/chat/${id}`)
  } catch {
    creating.value = false
    toast.add({
      description: 'Không tạo được cuộc trò chuyện, thử lại nhé!',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

function onSubmit() {
  if (!input.value.trim()) return
  createChat(input.value)
  input.value = ''
}
</script>

<template>
  <UDashboardPanel
    id="chat-home"
    class="min-h-0"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <Navbar />
    </template>

    <template #body>
      <div class="flex flex-1">
        <UContainer class="flex-1 flex flex-col justify-center gap-4 sm:gap-6 py-8 h-full">
          <h1 class="text-3xl sm:text-4xl text-highlighted font-bold">
            {{ greeting }}
          </h1>

          <UChatPrompt
            v-model="input"
            :status="creating ? 'submitted' : 'ready'"
            :disabled="creating"
            placeholder="Hỏi bất cứ điều gì về crypto..."
            class="[view-transition-name:chat-prompt]"
            variant="subtle"
            :ui="{ base: 'px-1.5' }"
            @submit="onSubmit"
          >
            <template #footer>
              <div class="flex items-center gap-1">
                <ChatModalSelect />
              </div>
              <UChatPromptSubmit
                :status="creating ? 'submitted' : 'ready'"
                color="neutral"
                size="sm"
              />
            </template>
          </UChatPrompt>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="quickChat in quickChats"
              :key="quickChat.label"
              :icon="quickChat.icon"
              :label="quickChat.label"
              size="sm"
              color="neutral"
              variant="outline"
              class="rounded-full"
              :disabled="creating"
              @click="createChat(quickChat.label)"
            />
          </div>
        </UContainer>
      </div>
    </template>
  </UDashboardPanel>
</template>
