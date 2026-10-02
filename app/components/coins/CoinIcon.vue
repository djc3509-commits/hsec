<script setup lang="ts">
// Icon coin lấy từ coin.icon (DB). Lỗi ảnh → fallback avatar chữ cái.
// Bỏ hẳn kiểu đoán URL từ symbol (coincap).
const props = withDefaults(defineProps<{
  symbol: string
  icon?: string | null
  size?: number
}>(), { icon: null, size: 32 })

const failed = ref(false)
// icon đổi → thử lại
watch(() => props.icon, () => {
  failed.value = false
})

const showImg = computed(() => !!props.icon && !failed.value)
const letter = computed(() => (props.symbol?.[0] ?? '?').toUpperCase())

// Màu nền ổn định theo symbol (hash) cho avatar chữ
const bg = computed(() => {
  let h = 0
  for (const ch of props.symbol ?? '') h = (h * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${h} 60% 45%)`
})
</script>

<template>
  <img
    v-if="showImg"
    :src="icon!"
    :alt="symbol"
    :style="{ width: size + 'px', height: size + 'px' }"
    class="rounded-full object-cover bg-gray-100 dark:bg-gray-800 shrink-0"
    @error="failed = true"
  >
  <span
    v-else
    class="rounded-full inline-flex items-center justify-center font-bold text-white shrink-0"
    :style="{ width: size + 'px', height: size + 'px', background: bg, fontSize: (size * 0.42) + 'px' }"
  >
    {{ letter }}
  </span>
</template>
