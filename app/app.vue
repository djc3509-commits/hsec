<template>
  <UApp
    :locale="uiLocales[locale]"
    :toaster="toaster"
  >
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import * as uiLocales from '@nuxt/ui/locale'

const { locale } = useI18n()
const toaster = {
  position: 'top-right' as const
}

const appConfig = useAppConfig()
const primaryCookie = useCookie('primary-color')
const neutralCookie = useCookie('neutral-color')

if (primaryCookie.value) {
  appConfig.ui.colors.primary = primaryCookie.value
}
if (neutralCookie.value) {
  appConfig.ui.colors.neutral = neutralCookie.value
}
</script>
