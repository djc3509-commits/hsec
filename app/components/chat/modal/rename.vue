<script setup lang="ts">
// PROPS & EMITS
const props = defineProps<{
  title?: string
}>()

const emit = defineEmits<{ close: [string | false] }>()

// STATE
const value = ref(props.title ?? '')
const trimmed = computed(() => value.value.trim())

// ACTIONS
function submit() {
  if (!trimmed.value) return
  emit('close', trimmed.value)
}
</script>

<template>
  <UModal
    title="Đổi tên cuộc trò chuyện"
    description="Nhập tiêu đề mới cho cuộc trò chuyện này."
    :close="false"
    :ui="{ footer: 'flex-row-reverse justify-start' }"
  >
    <template #body>
      <UInput
        v-model="value"
        autofocus
        size="lg"
        placeholder="Tiêu đề..."
        class="w-full"
        :ui="{ root: 'w-full' }"
        @keydown.enter.prevent="submit"
      />
    </template>

    <template #footer>
      <UButton
        label="Lưu"
        :disabled="!trimmed"
        @click="submit"
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
