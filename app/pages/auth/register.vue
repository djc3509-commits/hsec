<script lang="ts" setup>
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import * as z from 'zod'

const toast = useToast()
const { t } = useI18n()
const router = useRouter()
const { register } = useAuth()
const loading = ref(false)
const errorMessage = ref('')

definePageMeta({
  layout: 'blank'
})

// Cái này để reset form khi chuyển ngôn ngữ
const formKey = ref(0)

// 1. Chuyển đổi trong fields (Email, Password, Remember me)
const fields = computed<AuthFormField[]>(() => [
  {
    name: 'username',
    type: 'text',
    label: t('register.username'),
    placeholder: t('register.username_placeholder'),
    required: true
  },
  {
    name: 'fullname',
    type: 'text',
    label: t('register.fullname'),
    placeholder: t('register.fullname_placeholder'),
    required: true
  },
  {
    name: 'email',
    type: 'email',
    label: t('register.email'),
    placeholder: t('register.email_placeholder'),
    required: true
  },
  {
    name: 'password',
    type: 'password',
    label: t('register.password'),
    placeholder: t('register.password_placeholder'),
    required: true
  },
  {
    name: 'confirm_password',
    type: 'password',
    label: t('register.confirm_password'),
    placeholder: t('register.confirm_password_placeholder'),
    required: true
  },
  {
    name: 'terms',
    type: 'checkbox',
    label: t('register.terms')
  }
])

// 2. Chuyển đổi trong providers (Nút Google/GitHub)
const providers = computed(() => [
  {
    label: t('register.google'),
    icon: 'i-simple-icons-google',
    onClick: () => {
      toast.add({ title: t('register.google'), description: t('register.toast_google') })
    }
  },
  {
    label: t('register.github'),
    icon: 'i-simple-icons-github',
    onClick: () => {
      toast.add({ title: t('register.github'), description: t('register.toast_github') })
    }
  }
])

const schema = z.object({
  username: z.preprocess(v => (v === undefined || v === null ? '' : String(v)), z.string().min(3, t('register.error_username_min')).max(20, t('register.error_username_max'))),
  fullname: z.preprocess(v => (v === undefined || v === null ? '' : String(v)), z.string().min(2, t('register.error_fullname_min'))),
  email: z.preprocess(v => (v === undefined || v === null ? '' : String(v)), z.string().email(t('register.error_email'))),
  password: z.preprocess(v => (v === undefined || v === null ? '' : String(v)), z.string().min(8, t('register.error_password_min'))),
  confirm_password: z.preprocess(v => (v === undefined || v === null ? '' : String(v)), z.string().min(8, t('register.error_confirm_password_min'))),
  terms: z.preprocess(v => (v === undefined ? false : Boolean(v)), z.boolean().refine(val => val === true, {
    message: t('register.error_terms_required')
  }))
}).refine(data => data.password === data.confirm_password, {
  message: t('register.error_password_mismatch'),
  path: ['confirm_password']
})

const onSubmit = async (payload: FormSubmitEvent<Record<string, unknown>>) => {
  // Cast sang output type sau khi zod đã validate
  const data = payload.data as z.output<typeof schema>

  try {
    loading.value = true
    errorMessage.value = ''

    await register({
      username: data.username,
      fullname: data.fullname,
      email: data.email,
      password: data.password
    })

    toast.add({
      title: t('register.success'),
      description: t('register.toast_success'),
      color: 'primary'
    })
    router.push('/auth/login')
  } catch {
    errorMessage.value = t('register.error_invalid_credentials')
    toast.add({
      title: t('register.error'),
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
    <UPageCard>
      <UAuthForm
        :key="formKey"
        :schema="schema"
        :title="t('register.title')"
        :description="t('register.description')"
        icon="i-lucide-user-plus"
        :fields="fields"
        :providers="providers"
        @submit="onSubmit"
      >
        <template #footer>
          {{ t('register.already_have_account') }} <ULink
            to="/auth/login"
            class="text-primary font-medium"
          >{{ t('register.login_link') }}</ULink>.
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
