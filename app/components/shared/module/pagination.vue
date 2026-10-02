<template>
  <div
    v-bind="$attrs"
    class="flex flex-nowrap gap-2"
  >
    <template v-if="!props.hidenLimit">
      <USelect
        v-model="limit"
        variant="ghost"
        :items="items"
        trailing-icon="i-lucide-chevron-up"
        :disabled="props.loading"
      />
    </template>
    <UPagination
      v-model:page="page"
      :disabled="props.loading"
      :total="props.pagination.count"
      :items-per-page="Number(limit)"
      variant="soft"
      @update:page="emit('update:page', $event)"
    />
  </div>
</template>

<script setup lang="ts">
// Auto-import: <SharedModulePagination> (theo path shared/module/pagination)
// Dùng chung cho mọi page có table: markets, wallet, orders, ...
import type { SelectItem } from '@nuxt/ui'

const { t } = useI18n()

interface Pagination {
  count: number // tổng số bản ghi
  page?: number // trang hiện tại
  limit?: number // số bản ghi/trang
  totalPage?: number
}

const props = withDefaults(defineProps<{
  loading?: boolean
  hidenLimit?: boolean
  pagination: Pagination
}>(), {
  loading: false,
  hidenLimit: false
})

const emit = defineEmits<{
  (e: 'update:limit', value: number): void
  (e: 'update:page', value: number): void
}>()

const items = computed<SelectItem[]>(() =>
  [10, 20, 25, 50, 100, 200, 500].map(n => ({
    label: t('pagination.items_per_page', { count: n }),
    value: String(n)
  }))
)

const limit = ref(String(props.pagination?.limit ?? 25))
const page = ref(Number(props.pagination?.page ?? 1))

watch(
  () => props.pagination.limit,
  (newLimit) => {
    if (newLimit !== undefined && newLimit > 0) {
      limit.value = String(newLimit ?? 25)
    } else {
      limit.value = '25'
    }
  },
  { immediate: true }
)

watch(
  () => props.pagination.page,
  (newPage) => {
    page.value = Number(newPage ?? 1)
  },
  { immediate: true }
)

watch(limit, newLimit => emit('update:limit', Number(newLimit)))
watch(page, newPage => emit('update:page', Number(newPage)))
</script>
