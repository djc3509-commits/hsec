<script setup lang="ts">
// IMPORT
import type { DropdownMenuItem } from '@nuxt/ui'
import type { UISession, ChatHistoryResponse } from '../../server/dtos/chat'
import UserMenu from '~/components/layout/UserMenu.vue'
import { useChatActions } from '~/composables/chat/useChatActions'

// COMPOSABLES
const { renameChat, deleteChat } = useChatActions()

// STATE
const sidebarOpen = ref(false)
const searchOpen = ref(false)
const route = useRoute()

// SESSIONS
const { data: sessions, refresh: refreshSessions } = await useFetch('/api/chat/history', {
  key: 'chat-sessions',
  transform: (data: ChatHistoryResponse): UISession[] => data.chats.map(chat => ({
    id: chat.id,
    label: chat.title || 'Untitled',
    to: `/chat/${chat.id}`,
    createdAt: chat.created_at ? new Date(chat.created_at).toISOString() : new Date().toISOString()
  }))
})

// Refresh sidebar khi navigate sang chat mới
watch(() => route.params.id, () => refreshSessions())

// GROUP theo ngày
const { groups } = useChatDateGroups(sessions as Ref<UISession[] | undefined>)

const items = computed(() => groups.value.flatMap(group => [
  { label: group.label, type: 'label' as const },
  ...group.items.map(item => ({
    ...item,
    slot: 'chat' as const,
    icon: undefined,
    class: item.label === 'Untitled' ? 'text-muted' : ''
  }))
]))

const searchGroups = computed(() => groups.value.map(group => ({
  id: group.label.toLowerCase().replace(/\s+/g, '-'),
  label: group.label,
  items: group.items
})))

function getChatActions(item: { id: string, label: string }): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'Đổi tên',
        icon: 'i-lucide-pencil',
        onSelect: async () => {
          const newTitle = await renameChat(item.id, item.label === 'Untitled' ? '' : item.label)
          if (newTitle) refreshSessions()
        }
      }
    ],
    [
      {
        label: 'Xóa',
        icon: 'i-lucide-trash',
        color: 'error' as const,
        onSelect: async () => {
          const deleted = await deleteChat(item.id)
          if (deleted) refreshSessions()
        }
      }
    ]
  ]
}

defineShortcuts({
  meta_o: () => navigateTo('/chat'),
  meta_k: () => { searchOpen.value = true }
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <!-- Thanh loading xanh trên cùng — hiện khi navigate -->
    <NuxtLoadingIndicator />

    <UDashboardSidebar
      id="chat-sidebar"
      v-model:open="sidebarOpen"
      :min-size="12"
      collapsible
      resizable
      :menu="{ inset: true }"
      class="border-r-0 py-4 dark:[--ui-bg-elevated:var(--ui-color-neutral-900)]"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          v-if="!collapsed"
          to="/home"
          class="flex items-center gap-2 min-w-0"
        >
          <div class="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <UIcon
              name="i-heroicons-chart-bar-square"
              class="w-4 h-4 text-white"
            />
          </div>
          <span class="text-base font-bold text-highlighted truncate">HSEC</span>
          <UBadge
            label="AI"
            color="primary"
            variant="subtle"
            size="sm"
            class="shrink-0"
          />
        </NuxtLink>
        <UDashboardSidebarCollapse class="ms-auto" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          orientation="vertical"
          :items="[
            { label: 'Quay lại Dashboard', icon: 'i-lucide-arrow-left', to: '/home' },
            { label: 'Chat mới', to: '/chat', kbds: ['meta', 'o'], icon: 'i-lucide-circle-plus' },
            { label: 'Tìm kiếm', icon: 'i-lucide-search', kbds: ['meta', 'k'], onSelect: () => { searchOpen = true } }
          ]"
        >
          <template #item-trailing="{ item }">
            <div
              v-if="(item as any).kbds?.length"
              class="flex items-center gap-px opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <UKbd
                v-for="kbd in (item as any).kbds"
                :key="kbd"
                :value="kbd"
                size="sm"
                variant="soft"
                class="bg-accented/50"
              />
            </div>
          </template>
        </UNavigationMenu>

        <UNavigationMenu
          v-if="!collapsed"
          :items="items"
          orientation="vertical"
          :ui="{
            link: 'relative overflow-hidden pr-8',
            linkTrailing: 'absolute right-0 top-0 bottom-0 pr-2 flex items-center translate-x-full group-hover:translate-x-0 group-has-data-[state=open]:translate-x-0 transition-transform duration-200'
          }"
        >
          <template #chat-trailing="{ item }">
            <UDropdownMenu
              :items="getChatActions(item as { id: string; label: string })"
              :content="{ align: 'end' }"
            >
              <UButton
                as="div"
                icon="i-lucide-ellipsis"
                color="neutral"
                variant="link"
                size="sm"
                class="rounded-[5px] hover:bg-accented/50 focus-visible:bg-accented/50 data-[state=open]:bg-accented/50"
                aria-label="Chat actions"
                tabindex="-1"
                @click.stop.prevent
              />
            </UDropdownMenu>
          </template>
        </UNavigationMenu>
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <!-- SEARCH -->
    <UDashboardSearch
      v-model:open="searchOpen"
      placeholder="Tìm cuộc trò chuyện..."
      :groups="[
        {
          id: 'links',
          items: [
            { label: 'Chat mới', to: '/chat', icon: 'i-lucide-circle-plus', kbds: ['meta', 'o'] },
            { label: 'Quay lại Dashboard', to: '/app', icon: 'i-lucide-arrow-left' }
          ]
        },
        ...searchGroups
      ]"
    />

    <!-- MAIN CONTENT -->
    <div class="flex-1 flex m-4 lg:ml-0 rounded-lg ring ring-default bg-default/75 shadow min-w-0 overflow-hidden">
      <slot />
    </div>
  </UDashboardGroup>
</template>

<style>
/* View Transition cho UChatPrompt — bay từ giữa xuống dưới khi navigate */
::view-transition-old(chat-prompt),
::view-transition-new(chat-prompt) {
  animation-duration: 0.3s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

::view-transition-old(chat-prompt) {
  animation-name: prompt-slide-up;
}

::view-transition-new(chat-prompt) {
  animation-name: prompt-slide-down;
}

@keyframes prompt-slide-up {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-20px); }
}

@keyframes prompt-slide-down {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
