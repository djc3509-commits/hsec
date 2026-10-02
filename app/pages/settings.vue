<template>
  <UDashboardPanel id="settings">
    <template #header>
      <UDashboardNavbar :title="t('settings.title')">
        <template #leading>
          <UDashboardSidebarCollapse icon="i-lucide-settings" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <div class="overflow-x-auto">
          <UNavigationMenu
            :items="link"
            highlight
            orientation="horizontal"
            class="flex-1"
          />
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full mx-auto">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>

<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()

const link = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: t('settings.nav.general'),
      icon: 'i-lucide-user',
      to: '/settings/',
      exact: true
    },
    {
      label: t('settings.nav.members'),
      icon: 'i-lucide-users',
      to: '/settings/members',
      exact: true
    },
    {
      label: t('settings.nav.notifications'),
      icon: 'i-lucide-bell',
      to: '/settings/notifications',
      exact: true
    },
    {
      label: t('settings.nav.security'),
      icon: 'i-lucide-shield',
      to: '/settings/security',
      exact: true
    }
  ]
])
</script>
