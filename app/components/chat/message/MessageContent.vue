<script setup lang="ts">
import { isTextUIPart } from 'ai'
import type { UIMessage } from 'ai'
import { renderMarkdown } from '~/utils/markdown'

// Render từng part của UIMessage:
// - assistant → markdown (markdown-it, an toàn Windows)
// - user      → text thường
defineProps<{
  message: UIMessage
}>()
</script>

<template>
  <template
    v-for="(part, index) in message.parts"
    :key="`${message.id}-${index}`"
  >
    <template v-if="isTextUIPart(part)">
      <!-- An toàn: renderMarkdown dùng markdown-it html: false → HTML thô bị escape -->
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="message.role === 'assistant'"
        class="prose prose-sm dark:prose-invert max-w-none break-words *:first:mt-0 *:last:mb-0"
        v-html="renderMarkdown(part.text)"
      />
      <p
        v-else
        class="whitespace-pre-wrap [overflow-wrap:anywhere]"
      >
        {{ part.text }}
      </p>
      <!-- eslint-enable vue/no-v-html -->
    </template>
  </template>
</template>
