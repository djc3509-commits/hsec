<template>
  <UDashboardPanel>
    <template #body>
      <div class="flex flex-col gap-6 w-full  mx-auto px-4">
        <!-- ═══ HERO CARD ═══ -->
        <UCard :ui="{ root: 'relative overflow-hidden border-default rounded-2xl', body: 'p-6 sm:p-8' }">
          <!-- Gradient blobs -->
          <div class="pointer-events-none absolute -right-14 -top-14 size-56 rounded-full bg-primary/10 blur-3xl" />
          <div class="pointer-events-none absolute -bottom-10 left-8 size-40 rounded-full bg-primary/5 blur-2xl" />

          <div class="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <!-- Avatar with upload overlay -->
            <div class="relative group shrink-0">
              <UAvatar
                :src="user?.avatar ?? undefined"
                :alt="user?.fullname"
                size="3xl"
                :ui="{ root: 'ring-4 ring-primary/20 shadow-xl' }"
              >
                <template #fallback>
                  <span class="text-3xl font-bold text-primary">
                    {{ getInitials(user?.fullname) }}
                  </span>
                </template>
              </UAvatar>

              <!-- Active indicator -->
              <span
                class="absolute bottom-1 right-1 size-4 rounded-full border-2 border-white dark:border-default"
                :class="user?.is_active ? 'bg-emerald-500' : 'bg-gray-400'"
              />

              <!-- Click to upload overlay -->
              <label
                class="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="onAvatarChange"
                >
                <UIcon
                  :name="uploadingAvatar ? 'i-lucide-loader-circle' : 'i-lucide-camera'"
                  class="size-6 text-white"
                  :class="{ 'animate-spin': uploadingAvatar }"
                />
              </label>
            </div>

            <!-- Identity -->
            <div class="flex-1 text-center sm:text-left">
              <h1 class="text-2xl sm:text-3xl font-black text-default">
                {{ user?.fullname || '—' }}
              </h1>
              <p class="text-sm text-muted mt-1">
                {{ user?.email }}
              </p>

              <div class="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <UBadge
                  :label="user?.role"
                  :color="user?.role === 'ADMIN' ? 'warning' : 'primary'"
                  variant="soft"
                  size="sm"
                  icon="i-lucide-shield"
                />
                <UBadge
                  :label="user?.is_active ? t('profile.status_active') : t('profile.status_inactive')"
                  :color="user?.is_active ? 'success' : 'neutral'"
                  variant="soft"
                  size="sm"
                  :icon="user?.is_active ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
                />
                <UBadge
                  v-if="user?.is_expert"
                  :label="t('profile.expert')"
                  color="info"
                  variant="soft"
                  size="sm"
                  icon="i-lucide-award"
                />
              </div>
            </div>
          </div>
        </UCard>

        <!-- ═══ GRID: PERSONAL INFO + ACCOUNT DETAILS ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Personal Info Form -->
          <UCard :ui="{ root: 'border-default rounded-2xl', body: 'p-6' }">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-user-cog"
                  class="size-5 text-primary"
                />
                <h2 class="text-base font-bold text-default">
                  {{ t('profile.personal_info') }}
                </h2>
              </div>
            </template>

            <UForm
              :schema="schema"
              :state="contactState"
              class="space-y-4"
              @submit="onSubmitContact"
            >
              <UFormField
                :label="t('profile.fullname')"
                name="fullname"
                required
              >
                <UInput
                  v-model="contactState.fullname"
                  icon="i-lucide-user"
                  :placeholder="t('profile.fullname_placeholder')"
                  size="md"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="t('profile.email')"
                name="email"
              >
                <UInput
                  :model-value="user?.email"
                  icon="i-lucide-mail"
                  size="md"
                  disabled
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="t('profile.username')"
                name="username"
              >
                <UInput
                  :model-value="user?.username"
                  icon="i-lucide-at-sign"
                  size="md"
                  disabled
                  class="w-full"
                />
              </UFormField>

              <div class="flex justify-end pt-2">
                <UButton
                  type="submit"
                  color="primary"
                  :label="t('profile.save')"
                  icon="i-lucide-check"
                  :loading="savingContact"
                />
              </div>
            </UForm>
          </UCard>

          <!-- Account Details (Read-only) -->
          <UCard :ui="{ root: 'border-default rounded-2xl', body: 'p-6' }">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-id-card"
                  class="size-5 text-primary"
                />
                <h2 class="text-base font-bold text-default">
                  {{ t('profile.account_details') }}
                </h2>
              </div>
            </template>

            <div class="divide-y divide-default">
              <SettingsProfileField
                icon="i-lucide-hash"
                :label="t('profile.user_id')"
                :value="`#${user?.id ?? '—'}`"
              />
              <SettingsProfileField
                icon="i-lucide-at-sign"
                :label="t('profile.username')"
                :value="user?.username"
              />
              <SettingsProfileField
                icon="i-lucide-calendar"
                :label="t('profile.member_since')"
                :value="formatDate(user?.created_at)"
              />
              <SettingsProfileField
                icon="i-lucide-clock"
                :label="t('profile.last_updated')"
                :value="formatDate(user?.updated_at)"
              />
              <SettingsProfileField
                icon="i-lucide-shield"
                :label="t('profile.role')"
              >
                <UBadge
                  :label="user?.role"
                  :color="user?.role === 'ADMIN' ? 'warning' : 'primary'"
                  variant="soft"
                  size="xs"
                />
              </SettingsProfileField>
            </div>
          </UCard>
        </div>

        <!-- ═══ ROW 2: SECURITY + QUICK ACTIONS ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Security & Privacy -->
          <UCard :ui="{ root: 'border-default rounded-2xl', body: 'p-6' }">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-shield-check"
                  class="size-5 text-emerald-500"
                />
                <h2 class="text-base font-bold text-default">
                  {{ t('profile.security_title') }}
                </h2>
              </div>
            </template>

            <div class="space-y-3">
              <NuxtLink
                to="/settings/security"
                class="flex items-center justify-between p-3 rounded-xl border border-default hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div class="flex items-center gap-3">
                  <div class="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <UIcon
                      name="i-lucide-key-round"
                      class="size-5"
                    />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-default">{{ t('profile.change_password') }}</p>
                    <p class="text-xs text-muted">{{ t('profile.change_password_hint') }}</p>
                  </div>
                </div>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all"
                />
              </NuxtLink>

              <div class="flex items-center justify-between p-3 rounded-xl border border-default opacity-60">
                <div class="flex items-center gap-3">
                  <div class="flex items-center justify-center size-10 rounded-lg bg-amber-500/10 text-amber-500">
                    <UIcon
                      name="i-lucide-smartphone"
                      class="size-5"
                    />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-default">
                      {{ t('profile.two_factor') }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ t('profile.two_factor_hint') }}
                    </p>
                  </div>
                </div>
                <UBadge
                  :label="t('profile.coming_soon')"
                  color="neutral"
                  variant="soft"
                  size="xs"
                />
              </div>

              <NuxtLink
                to="/settings/notifications"
                class="flex items-center justify-between p-3 rounded-xl border border-default hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div class="flex items-center gap-3">
                  <div class="flex items-center justify-center size-10 rounded-lg bg-blue-500/10 text-blue-500">
                    <UIcon
                      name="i-lucide-bell"
                      class="size-5"
                    />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-default">{{ t('profile.notifications') }}</p>
                    <p class="text-xs text-muted">{{ t('profile.notifications_hint') }}</p>
                  </div>
                </div>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all"
                />
              </NuxtLink>
            </div>
          </UCard>

          <!-- Quick Stats / Wallet Snapshot -->
          <UCard :ui="{ root: 'border-default rounded-2xl', body: 'p-6' }">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-activity"
                  class="size-5 text-primary"
                />
                <h2 class="text-base font-bold text-default">
                  {{ t('profile.activity_title') }}
                </h2>
              </div>
            </template>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {{ t('profile.stat_status') }}
                </p>
                <p class="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1">
                  {{ user?.is_active ? t('profile.status_active') : t('profile.status_inactive') }}
                </p>
                <p class="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                  {{ t('profile.stat_status_hint') }}
                </p>
              </div>

              <div class="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {{ t('profile.stat_role') }}
                </p>
                <p class="text-lg font-black text-blue-700 dark:text-blue-300 mt-1">
                  {{ user?.role || '—' }}
                </p>
                <p class="text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-1">
                  {{ t('profile.stat_role_hint') }}
                </p>
              </div>

              <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {{ t('profile.stat_expert') }}
                </p>
                <p class="text-lg font-black text-amber-700 dark:text-amber-300 mt-1">
                  {{ user?.is_expert ? t('profile.expert_yes') : t('profile.expert_no') }}
                </p>
                <p class="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-1">
                  {{ t('profile.stat_expert_hint') }}
                </p>
              </div>

              <div class="p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  {{ t('profile.stat_account_age') }}
                </p>
                <p class="text-lg font-black text-violet-700 dark:text-violet-300 mt-1">
                  {{ accountAgeDays }} {{ t('profile.days') }}
                </p>
                <p class="text-[10px] text-violet-600/70 dark:text-violet-400/70 mt-1">
                  {{ t('profile.stat_account_age_hint') }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()
const { user } = useAuth()
const { updateProfile, uploadAvatar } = useProfile()

const schema = z.object({
  fullname: z.string().min(2, t('profile.error_fullname_min')).max(100, t('profile.error_fullname_max'))
})

const contactState = reactive({
  fullname: user.value?.fullname ?? ''
})

// Sync state khi user thay đổi từ ngoài (refresh, login lại...)
watch(() => user.value?.fullname, (v) => {
  if (v && contactState.fullname !== v) contactState.fullname = v
}, { immediate: true })

const savingContact = ref(false)
const uploadingAvatar = ref(false)

async function onSubmitContact(_evt: FormSubmitEvent<z.output<typeof schema>>) {
  savingContact.value = true
  try {
    await updateProfile({ fullname: contactState.fullname })
    toast.add({
      title: t('profile.toast_saved'),
      icon: 'i-lucide-check-circle',
      color: 'success',
      duration: 3000
    })
  } catch (err) {
    const e = err as { data?: { statusMessage?: string }, statusMessage?: string }
    toast.add({
      title: t('profile.toast_save_error'),
      description: e?.data?.statusMessage || e?.statusMessage || '',
      icon: 'i-lucide-x-circle',
      color: 'error',
      duration: 4000
    })
  } finally {
    savingContact.value = false
  }
}

async function onAvatarChange(evt: Event) {
  const file = (evt.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: t('profile.toast_avatar_too_large'), color: 'error', duration: 3000 })
    return
  }
  uploadingAvatar.value = true
  try {
    await uploadAvatar(file)
    toast.add({
      title: t('profile.toast_avatar_updated'),
      icon: 'i-lucide-check-circle',
      color: 'success',
      duration: 3000
    })
  } catch (e) {
    toast.add({
      title: t('profile.toast_avatar_error'),
      description: (e as { data?: { statusMessage?: string } })?.data?.statusMessage || '',
      icon: 'i-lucide-x-circle',
      color: 'error',
      duration: 4000
    })
  } finally {
    uploadingAvatar.value = false
    // Reset input để chọn lại file cùng tên cũng fire change
    ;(evt.target as HTMLInputElement).value = ''
  }
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(s?: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// Số ngày kể từ khi tạo tài khoản
const accountAgeDays = computed(() => {
  if (!user.value?.created_at) return 0
  const created = new Date(user.value.created_at).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)))
})
</script>
