<template>
  <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12">
    <!-- Root duy nhất: lặp lại gap của khung cha (settings.vue) để giữ nguyên khoảng cách -->
    <UPageCard
      title="Password"
      description="Confirm your current password before setting a new one."
      variant="subtle"
    >
      <UForm
        :schema="passwordSchema"
        :state="password"
        :validate="validate"
        class="flex flex-col gap-4 max-w-xs"
      >
        <UFormField name="current">
          <UInput
            v-model="password.current"
            type="password"
            placeholder="Current password"
            class="w-full"
          />
        </UFormField>

        <UFormField name="new">
          <UInput
            v-model="password.new"
            type="password"
            placeholder="New Password"
            class="w-full"
          />
        </UFormField>

        <UButton
          label="Update"
          class="w-fit"
          @click="onSubmit"
        />
      </UForm>
    </UPageCard>
    <UPageCard
      title="Account"
      description="No longer want to use our service? You can delete your account here. This action is not reversible. All information related to this account will be deleted permanently."
      class="bg-linear-to-tl from-error/10 from-5% to-default"
    >
      <template #footer>
        <UButton
          label="Delete account"
          color="error"
        />
      </template>
    </UPageCard>
  </div>
</template>

<script lang="ts" setup>
import type { FormError } from '@nuxt/ui'
import z from 'zod'

const passwordSchema = z.object({
  current: z.string().min(8, 'Must be at least 8 characters'),
  new: z.string().min(8, 'Must be at least 8 characters')

})

type PasswordSchema = z.output<typeof passwordSchema>
const password = reactive<Partial<PasswordSchema>>({
  current: undefined,
  new: undefined

})

const validate = (state: Partial<PasswordSchema>): FormError[] => {
  const error: FormError[] = []
  if (state.current && state.new && state.current === state.new) {
    error.push({ name: 'new', message: 'Passwords must be different' })
  }
  return error
}

const onSubmit = async () => {
}
</script>

<style>

</style>
