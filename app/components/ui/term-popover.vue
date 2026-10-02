<!--
  TermPopover — Tooltip giải thích thuật ngữ giao dịch (EN · VI + mô tả) khi hover.
  Dùng UPopover mode="hover" (giống pattern picker ở /analyst).
  - hint=true  → kèm icon ⓘ nhỏ mờ + con trỏ "help" (gợi ý hover được).
  - hint=false → bọc quanh badge/icon, không thêm gì thừa.
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  en: string // tên thuật ngữ tiếng Anh (canonical)
  vi: string // gloss theo ngôn ngữ hiện tại
  desc?: string // giải thích chi tiết (tùy chọn)
  hint?: boolean // hiện icon ⓘ + cursor-help
}>(), { hint: true })

// Ẩn phần "· vi" khi trùng tên EN (vd locale tiếng Anh: tên == gloss).
const showGloss = computed(() => !!props.vi && props.vi !== props.en)
</script>

<template>
  <UPopover
    mode="hover"
    :open-delay="100"
    :close-delay="80"
    :content="{ side: 'top', align: 'center' }"
  >
    <span class="inline-flex items-center gap-1 cursor-help">
      <slot />
      <UIcon
        v-if="hint"
        name="i-lucide-circle-alert"
        class="w-3 h-3 opacity-40 shrink-0"
      />
    </span>

    <template #content>
      <div class="p-3 max-w-xs space-y-1.5">
        <div class="flex items-center gap-1.5 flex-wrap">
          <UIcon
            name="i-lucide-book-open"
            class="w-3.5 h-3.5 text-primary-500 shrink-0"
          />
          <span class="font-bold text-sm">{{ en }}</span>
          <span
            v-if="showGloss"
            class="text-xs font-semibold text-primary-500"
          >· {{ vi }}</span>
        </div>
        <p
          v-if="desc"
          class="text-xs text-slate-500 dark:text-gray-400 leading-relaxed"
        >
          {{ desc }}
        </p>
      </div>
    </template>
  </UPopover>
</template>
