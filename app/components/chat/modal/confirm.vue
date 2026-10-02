<script setup lang="ts">
// PROPS & EMITS
defineProps<{
  title: string
  description: string
  color?: 'error' | 'warning' | 'info' | 'success'
}>()

const emit = defineEmits<{ close: [boolean] }>()
</script>

<template>
  <UModal
    :title="title"
    :description="description"
    :close="false"
    :dismissible="false"
    :ui="{ footer: 'flex-row-reverse justify-start' }"
  >
    <template #footer>
      <UButton
        :color="color"
        label="Xác nhận"
        @click="emit('close', true)"
      />
      <UButton
        color="neutral"
        variant="ghost"
        label="Hủy"
        @click="emit('close', false)"
      />
    </template>
  </UModal>
</template>
