<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'blank'
})

const router = useRouter()
const { login } = useAuth()
const loading = ref(false)
const errorMessage = ref('')

const formKey = ref(0)
const toast = useToast()
const { t } = useI18n()

// 1. Chuyển đổi dữ liệu trong mảng fields
const fields = computed<AuthFormField[]>(() => [
  {
    name: 'email',
    type: 'email',
    label: t('login.email'),
    placeholder: t('login.email_placeholder'),
    required: true
  },
  {
    name: 'password',
    type: 'password',
    label: t('login.password'),
    placeholder: t('login.password_placeholder'),
    required: true
  },
  {
    name: 'remember',
    type: 'checkbox',
    label: t('login.remember')
  }
])

// 2. Chuyển đổi trong providers (Nút Google/GitHub)
const providers = computed(() => [
  {
    label: t('login.google'),
    icon: 'i-simple-icons-google',
    onClick: () => {
      toast.add({ title: t('login.google'), description: t('login.toast_google') })
    }
  },
  {
    label: t('login.github'),
    icon: 'i-simple-icons-github',
    onClick: () => {
      toast.add({ title: t('login.github'), description: t('login.toast_github') })
    }
  }])

// 3. Zod schema with preprocessing to coerce undefined -> '' so we get custom messages
const schema = z.object({
  email: z.preprocess(
    val => (val === undefined || val === null ? '' : String(val)),
    z.string().email(t('login.error_email'))
  ),
  password: z.preprocess(
    val => (val === undefined || val === null ? '' : String(val)),
    z.string().min(8, t('login.error_password_min'))
  )
})

const onSubmit = async (payload: FormSubmitEvent<Record<string, unknown>>) => {
  // Cast sang output type sau khi zod đã validate
  const data = payload.data as z.output<typeof schema>

  try {
    loading.value = true
    errorMessage.value = ''

    await login(data.email, data.password)

    toast.add({
      title: t('login.success'),
      description: t('login.toast_success'),
      color: 'primary'
    })

    await router.push('/home/')
  } catch {
    errorMessage.value = t('login.error_invalid_credentials')
    toast.add({
      title: t('login.error'),
      description: errorMessage.value,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4">
    <Language />

    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :key="formKey"
        :schema="schema"
        :title="t('login.title')"
        :description="t('login.description')"
        icon="i-lucide-user"
        :fields="fields"
        :providers="providers"
        @submit="onSubmit"
      >
        <template #footer>
          {{ t('login.no_account') }} <ULink
            to="/auth/register"
            class="text-primary font-medium"
          >{{ t('login.register_link') }}</ULink>.
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
