<!-- components/orders/coin-selector.vue -->
<template>
  <div class="flex items-center gap-2 ml-2">
    <UPopover
      v-model:open="popoverOpen"
      :content="{ align: 'start' }"
    >
      <div
        class="flex items-center gap-2 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-lg transition-colors"
      >
        <img
          v-if="active"
          :src="active.icon"
          class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0"
        >
        <span
          v-if="active"
          class="font-semibold text-sm text-gray-900 dark:text-white"
        >{{ active.label }}</span>
        <UIcon
          name="i-heroicons-chevron-down"
          class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
          :class="popoverOpen ? 'rotate-180' : ''"
        />
      </div>

      <template #content>
        <div class="flex flex-col w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
          <div class="p-2 border-b border-gray-100 dark:border-gray-800">
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              placeholder="Tìm kiếm tiền mã hóa..."
              size="sm"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  v-show="searchQuery !== ''"
                  color="neutral"
                  variant="link"
                  icon="i-heroicons-x-mark-20-solid"
                  :padded="false"
                  @click="clearSearch"
                />
              </template>
            </UInput>
          </div>
          <div
            class="grid grid-cols-[1.2fr_1fr_1fr] gap-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 py-2"
          >
            <span>Tên</span><span class="text-right">Giá gần nhất</span><span class="text-right">Thay đổi</span>
          </div>
          <div class="max-h-100 overflow-y-auto scrollbar-hide pb-1">
            <div
              v-for="coin in filteredCoins"
              :key="coin.id"
              class="w-full grid grid-cols-[1.2fr_1fr_1fr] gap-2 px-3 py-2 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
              @click="select(coin.id)"
            >
              <div class="flex items-center gap-2">
                <img
                  :src="coin.icon"
                  :alt="coin.label"
                  class="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0"
                >
                <span class="text-xs font-bold text-gray-900 dark:text-white truncate">{{ coin.label }}</span>
              </div>
              <div class="text-right text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                {{
                  formatPrice(coin.price) }}
              </div>
              <div
                class="text-right text-xs font-medium tabular-nums"
                :class="coin.priceChange >= 0 ? 'text-emerald-500' : 'text-red-500'"
              >
                {{ formatChange(coin.priceChange) }}
              </div>
            </div>
            <div
              v-if="filteredCoins.length === 0"
              class="py-8 flex flex-col items-center justify-center text-gray-400"
            >
              <UIcon
                name="i-heroicons-document-magnifying-glass"
                class="w-6 h-6 mb-1 opacity-50"
              />
              <span class="text-[11px]">Không tìm thấy kết quả</span>
            </div>
          </div>
        </div>
      </template>
    </UPopover>

    <div class="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
    <span
      class="text-lg font-semibold tabular-nums"
      :class="priceUp ? 'text-emerald-500' : 'text-red-500'"
    >{{
      formatPrice(currentPrice) }}</span>
    <span
      class="text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-md"
      :class="priceUp ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'"
    >
      {{ formatChange(priceChange) }}
    </span>
  </div>
</template>

<script lang="ts" setup>
interface CoinOption {
  id: string
  icon: string
  label: string
  price: number
  priceChange: number
}

const props = defineProps<{
  coins: CoinOption[]
  modelValue: string
  currentPrice: number
  priceChange: number
  priceUp: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [val: string] }>()

const popoverOpen = ref(false)
const searchQuery = ref('')

const active = computed(() => props.coins.find(c => c.id === props.modelValue) || props.coins[0])

const filteredCoins = computed(() => {
  if (!searchQuery.value) return props.coins
  const q = searchQuery.value.toLowerCase()
  return props.coins.filter(c => c.label.toLowerCase().includes(q))
})

function clearSearch() { searchQuery.value = '' }

function select(id: string) {
  emit('update:modelValue', id)
  popoverOpen.value = false
}
</script>
