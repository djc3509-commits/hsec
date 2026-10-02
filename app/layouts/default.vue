<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          v-if="!collapsed"
          to="/"
          class="font-bold text-xl cursor-pointer"
        >
          HSEC
        </NuxtLink>
        <UIcon
          v-else
          name="i-lucide-home"
          class="size-5 mx-auto"
        />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" />
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigationItems[0]"
          orientation="vertical"
          tooltip
          popover
        />
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigationItems[1]"
          orientation="vertical"
          tooltip
          popover
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel
      grow
      class="flex flex-col min-h-screen overflow-y-auto scrollbar-hide"
    >
      <div class="flex-1">
        <slot />
      </div>

      <template v-if="!route.meta.hideFooter">
        <UFooter
          :ui="{
            root: 'w-full border-t border-default',
            top: 'border-b border-default'
          }"
        >
          <template #top>
            <div class="w-full mx-auto px-4 lg:px-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
                <div class="lg:col-span-2 space-y-5">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                      <UIcon
                        name="i-heroicons-chart-bar-square"
                        class="w-5 h-5 text-white"
                      />
                    </div>
                    <span class="text-lg font-bold text-gray-900 dark:text-white">HSEC</span>
                  </div>

                  <p class="text-sm text-muted leading-relaxed max-w-sm">
                    {{ t('layout.footer.description') }}
                  </p>

                  <div class="flex items-center gap-2">
                    <a
                      v-for="(btn, i) in footerButtons"
                      :key="i"
                      :href="btn.to"
                      target="_blank"
                      class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-primary hover:text-white transition"
                    >
                      <UIcon
                        :name="btn.icon"
                        class="w-4 h-4"
                      />
                    </a>
                  </div>

                  <div class="pt-1">
                    <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {{ t('layout.footer.newsletter_title') }}
                    </p>
                    <UForm
                      :state="{ email }"
                      @submit.prevent="onSubmit"
                    >
                      <UFormField v-bind="footerForm">
                        <UInput
                          v-model="email"
                          v-bind="footerInput"
                        >
                          <template #trailing>
                            <UButton v-bind="footerButton" />
                          </template>
                        </UInput>
                      </UFormField>
                    </UForm>
                  </div>
                </div>

                <div
                  v-for="col in footerColumns"
                  :key="col.label"
                  class="space-y-4"
                >
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ col.label }}
                  </h3>
                  <ul class="space-y-2">
                    <li
                      v-for="link in col.children"
                      :key="link.label"
                    >
                      <NuxtLink
                        :to="link.to"
                        class="text-sm text-muted hover:text-primary transition-colors"
                      >
                        {{ link.label }}
                      </NuxtLink>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </template>

          <template #default>
            <div
              class="max-w-7xl mx-auto px-6 lg:px-8 py-2 flex flex-col md:flex-row items-center justify-between text-xs text-muted"
            >
              <p>
                {{ t('layout.footer.built_with') }}
                <span class="text-primary font-medium">HSEC</span>
                • © {{ new Date().getFullYear() }}
              </p>
              <div class="flex items-center gap-3 mt-2 md:mt-0">
                <NuxtLink
                  to="#"
                  class="hover:text-primary transition-colors"
                >{{ t('layout.footer.terms') }}</NuxtLink>
                <span>•</span>
                <NuxtLink
                  to="#"
                  class="hover:text-primary transition-colors"
                >{{ t('layout.footer.privacy') }}
                </NuxtLink>
                <span>•</span>
                <NuxtLink
                  to="#"
                  class="hover:text-primary transition-colors"
                >{{ t('layout.footer.cookie') }}</NuxtLink>
              </div>
            </div>
          </template>
        </UFooter>
      </template>
    </UDashboardPanel>

    <!-- AI Chat Panel — smooth transition bằng CSS width -->
    <div
      class="flex flex-col border-l border-default bg-default overflow-hidden shrink-0 transition-[width] duration-300 ease-in-out"
      :style="{ width: (aiOpen && !isFullChatPage) ? '22rem' : '0' }"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-default shrink-0">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-bot-message-square"
            class="size-4 text-primary"
          />
          <span class="font-semibold text-sm whitespace-nowrap">{{ t('layout.ai.assistant') }}</span>
        </div>
        <div class="flex items-center gap-1">
          <!-- Nút tạo mới -->
          <UTooltip :text="t('layout.ai.new_chat')">
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="chatPanelRef?.handleNewChat()"
            />
          </UTooltip>
          <UTooltip :text="t('layout.ai.fullscreen')">
            <UButton
              icon="i-lucide-maximize-2"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="goFullChat"
            />
          </UTooltip>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="aiOpen = false"
          />
        </div>
      </div>

      <!-- Body — chỉ render khi panel đã mở hẳn (để đo width đúng, hết bug ô rỗng cao) -->
      <div class="flex-1 overflow-hidden">
        <ChatPanel
          v-if="panelReady"
          ref="chatPanelRef"
        />
      </div>
    </div>
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import UserMenu from '~/components/layout/UserMenu.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const chatPanelRef = ref<{ handleNewChat: () => void } | null>(null)

// AI Chat
const aiOpen = useState('ai-chat-open', () => false)
const isFullChatPage = computed(() => route.path.startsWith('/chat'))

// Chỉ render nội dung panel SAU khi nó trượt mở xong (đã đủ rộng) → tránh autoresize
// đo nhầm chiều cao ô nhập lúc panel còn width ~0 (khiến ô rỗng bị cao 6 dòng).
const panelReady = ref(false)
watch(aiOpen, (open) => {
  panelReady.value = false
  if (open) {
    // > thời gian transition 300ms
    setTimeout(() => {
      panelReady.value = true
    }, 320)
  }
})

function toggleAi() {
  if (isFullChatPage.value) {
    router.back()
  } else {
    aiOpen.value = !aiOpen.value
  }
}

// Con trỏ chat chung (đồng bộ panel ↔ full page) — để mở toàn màn hình đúng chat
const { activeId } = useChatSession()

function goFullChat() {
  aiOpen.value = false
  if (activeId.value) {
    router.push(`/chat/${activeId.value}`)
  } else {
    router.push('/chat')
  }
}

// Navigation
const navigationItems = computed<NavigationMenuItem[][]>(() => [
  [
    { label: t('layout.sidebar.home'), icon: 'i-lucide-house', to: '/home' },
    { label: t('layout.sidebar.markets'), icon: 'i-heroicons-queue-list', to: '/markets' },
    { label: t('layout.sidebar.assets'), icon: 'i-heroicons-wallet', to: '/wallets' },
    { label: t('layout.sidebar.orders'), icon: 'i-heroicons-book-open', to: '/orders' },
    { label: t('layout.sidebar.community'), icon: 'i-heroicons-user-group', to: '/community' },
    { label: t('layout.sidebar.news'), icon: 'i-heroicons-newspaper', to: '/news' },
    { label: t('layout.sidebar.analyst'), icon: 'i-lucide-sparkles', to: '/analyst' },
    {
      label: t('layout.sidebar.settings'),
      icon: 'i-lucide-settings',
      children: [
        { label: t('layout.sidebar.profile'), icon: 'i-lucide-user', to: '/settings/' },
        { label: t('layout.sidebar.members'), icon: 'i-lucide-users', to: '/settings/members' },
        { label: t('layout.sidebar.notifications'), icon: 'i-lucide-bell', to: '/settings/notifications' },
        { label: t('layout.sidebar.security'), icon: 'i-lucide-shield', to: '/settings/security' }
      ].map(i => ({ ...i, exact: true }))
    }
  ],
  [
    { label: t('layout.ai.chat_ai'), icon: 'i-lucide-bot', onClick: () => toggleAi() }
  ]
])

// Footer
const toast = useToast()
const email = ref('')
const loading = ref(false)

const onSubmit = () => {
  loading.value = true
  toast.add({
    title: t('layout.footer.toast_title'),
    description: t('layout.footer.toast_desc')
  })
  loading.value = false
}

const footerColumns = computed(() => [
  {
    label: t('layout.footer.about'),
    children: [
      { label: t('layout.footer.about_links.0'), to: '#' },
      { label: t('layout.footer.about_links.1'), to: '#' },
      { label: t('layout.footer.about_links.2'), to: '#' },
      { label: t('layout.footer.about_links.3'), to: '#' }
    ]
  },
  {
    label: t('layout.footer.trade'),
    children: [
      { label: t('layout.footer.trade_links.0'), to: '#' },
      { label: t('layout.footer.trade_links.1'), to: '#' },
      { label: t('layout.footer.trade_links.2'), to: '#' },
      { label: t('layout.footer.trade_links.3'), to: '#' }
    ]
  },
  {
    label: t('layout.footer.support'),
    children: [
      { label: t('layout.footer.support_links.0'), to: '#' },
      { label: t('layout.footer.support_links.1'), to: '#' },
      { label: t('layout.footer.support_links.2'), to: '#' },
      { label: t('layout.footer.support_links.3'), to: '#' }
    ]
  }
])

const footerButtons = [
  { to: 'https://discord.com', icon: 'i-simple-icons-discord' },
  { to: 'https://x.com', icon: 'i-simple-icons-x' },
  { to: 'https://github.com', icon: 'i-simple-icons-github' }
]

const footerForm = { name: 'email', size: 'lg' as const }

const footerInput = computed(() => ({
  type: 'email',
  class: 'w-full',
  placeholder: t('layout.footer.email_placeholder')
}))

const footerButton = computed(() => ({
  type: 'submit' as const,
  label: t('layout.footer.subscribe_btn'),
  size: 'xs' as const
}))
</script>
