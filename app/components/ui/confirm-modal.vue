<template>
  <UModal
    :title="props.title"
    :ui="{
      content: 'w-80 lg:w-120  top-40',
      footer: 'justify-end'
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <p class="text-sm text-gray-900 dark:text-white">
        {{ props.description }}
      </p>
    </template>

    <template #footer>
      <UButton
        :label="props.cancelText"
        color="neutral"
        variant="outline"
        @click="emit('update:open', false)"
      />
      <UButton
        :label="props.confirmText"
        :color="props.confirmColor"
        variant="solid"
        :loading="props.loading"
        @click="emit('confirm')"
      />
    </template>
  </UModal>
</template>

<script lang="ts" setup>
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
}>()

// Định nghĩa các "cổng" (props) để truyền dữ liệu vào Component này
const props = withDefaults(defineProps<Props>(), {
  title: 'Confirm Action',
  description: 'Are you sure you want to perform this action?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmColor: 'primary'
})

interface Props {
  title: string
  description: string
  confirmText: string
  cancelText: string
  confirmColor: 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | undefined
  loading?: boolean
}
</script>
