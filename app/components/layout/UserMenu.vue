<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :label="user?.fullname"
      :avatar="{
        src: user?.avatar ?? undefined,
        alt: user?.fullname
      }"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      color="neutral"
      variant="ghost"
      block
      class="data-[state=open]:bg-accented"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
    <template #chip-leading="{ item }">
      <div class="inline-flex items-center justify-center shrink-0 size-5">
        <span
          class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2"
          :style="{
            '--chip-light': `var(--color-${(item as any).chip}-500)`,
            '--chip-dark': `var(--color-${(item as any).chip}-400)`
          }"
        />
      </div>
    </template>
  </UDropdownMenu>
</template>

<script lang="ts" setup>
import type { DropdownMenuItem } from '@nuxt/ui'

const { locale, locales, setLocale, t } = useI18n()
const { user, logout } = useAuth()

const primaryCookie = useCookie('primary-color')
const neutralCookie = useCookie('neutral-color')

defineProps<{
  collapsed?: boolean
}>()

const colorMode = useColorMode()
const appConfig = useAppConfig()

const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']

const items = computed<DropdownMenuItem[][]>(() => (
  [
    [
      {
        type: 'label',
        label: user.value?.fullname,
        avatar: { src: user.value?.avatar ?? undefined, alt: user.value?.fullname }
      }
    ],
    [
      {
        label: t('common.menu.profile'),
        icon: 'i-lucide-user'
      },
      {
        label: t('common.menu.billing'),
        icon: 'i-lucide-credit-card'
      },
      {
        label: t('common.menu.settings'),
        icon: 'i-lucide-settings',
        to: '/settings'
      }
    ],
    [
      {
        label: t('user_menu.theme'),
        icon: 'i-lucide-palette',
        children: [
          {
            label: t('user_menu.primary'),
            slot: 'chip',
            chip: appConfig.ui.colors.primary,
            content: {
              align: 'center',
              collisionPadding: 16
            },
            children: colors.map(color => ({
              label: color,
              chip: color,
              slot: 'chip',
              checked: appConfig.ui.colors.primary === color,
              type: 'checkbox',
              onSelect: (e: Event) => {
                e.preventDefault()
                appConfig.ui.colors.primary = color
                primaryCookie.value = color
              }
            }))
          },
          {
            label: t('user_menu.neutral'),
            slot: 'chip',
            chip: appConfig.ui.colors.neutral === 'neutral' ? 'old-neutral' : appConfig.ui.colors.neutral,
            content: {
              align: 'end',
              collisionPadding: 16
            },
            children: neutrals.map(color => ({
              label: color,
              chip: color === 'neutral' ? 'old-neutral' : color,
              slot: 'chip',
              type: 'checkbox',
              checked: appConfig.ui.colors.neutral === color,
              onSelect: (e) => {
                e.preventDefault()
                appConfig.ui.colors.neutral = color
                neutralCookie.value = color
              }
            }))
          }
        ]
      },
      {
        label: t('user_menu.appearance'),
        icon: 'i-lucide-sun-moon',
        children: [
          {
            label: t('user_menu.light'),
            icon: 'i-lucide-sun',
            type: 'checkbox',
            checked: colorMode.preference === 'light',
            onSelect(e: Event) {
              e.preventDefault()
              colorMode.preference = 'light'
            }
          },
          {
            label: t('user_menu.dark'),
            icon: 'i-lucide-moon',
            type: 'checkbox',
            checked: colorMode.preference === 'dark',
            onSelect(e: Event) {
              e.preventDefault()
              colorMode.preference = 'dark'
            }
          }
        ]
      },
      {
        label: t('user_menu.language'),
        icon: 'i-lucide-globe',
        children: locales.value.map(lang => ({
          label: lang.name,
          type: 'checkbox',
          checked: locale.value === lang.code,
          onSelect: async (e: Event) => {
            e.preventDefault()
            await setLocale(lang.code)
          }
        }))
      }
    ],
    [
      {
        label: t('common.action.sign_out'),
        icon: 'i-lucide-log-out',
        async onSelect() {
          await logout()
        }
      }
    ]
  ]
))
</script>
