<script setup lang="ts">
import type { UIMessage } from 'ai'
import { isTextUIPart } from 'ai'
import { useClipboard } from '@vueuse/core'

const props = defineProps<{
  message: UIMessage
  streaming: boolean
}>()

const clipboard = useClipboard()
const copied = ref(false)

function copy() {
  const text = (props.message.parts || [])
    .filter(isTextUIPart)
    .map(p => p.text ?? '')
    .join('')
  clipboard.copy(text)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <template v-if="message.role === 'assistant' && !streaming">
    <UTooltip text="Sao chép">
      <UButton
        size="sm"
        :color="copied ? 'primary' : 'neutral'"
        variant="ghost"
        :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
        aria-label="Sao chép"
        @click="copy"
      />
    </UTooltip>
  </template>
</template>
