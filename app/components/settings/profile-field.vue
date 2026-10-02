<!-- profile-field.vue — Read-only field display dùng cho Account Details. -->
<template>
  <div class="flex items-start gap-3 py-2">
    <div class="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary shrink-0">
      <UIcon
        :name="icon"
        class="size-4"
      />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">
        {{ label }}
      </p>
      <slot>
        <p class="text-sm font-medium text-default break-words">
          {{ value || '—' }}
        </p>
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  icon: string
  label: string
  value?: string | number | null
}>()
</script>
