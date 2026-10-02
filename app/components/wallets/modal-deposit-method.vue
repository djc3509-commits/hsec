<template>
  <UModal
    fullscreen
    :ui="{
      footer: 'justify-end',
      content: 'h-full w-80 lg:w-100 ml-auto'
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #header>
      <div class="flex items-start justify-between w-full">
        <div>
          <h2 class="text-lg font-semibold">
            Nạp tiền vào ví
          </h2>
          <p class="text-xs text-gray-400">
            Chọn cách thức nạp muốn bắt đầu
          </p>
        </div>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="emit('update:open', false)"
        />
      </div>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 p-4">
        <!-- Chọn tiền tệ -->
        <div />

        <!-- Nhóm phương thức -->
        <div
          v-for="group in paymentGroups"
          :key="group.label"
        >
          <p class="text-xs text-gray-400 uppercase tracking-widest mb-2">
            {{ group.label }}
          </p>
          <div class="flex flex-col gap-2">
            <div
              v-for="method in group.methods"
              :key="method.key"
              class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700
                     cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              @click="emit('select-method', method)"
            >
              <!-- Icon -->
              <div class="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                <UIcon
                  :name="method.icon"
                  class="text-white text-lg"
                />
              </div>

              <!-- Nội dung -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-sm">{{ method.title }}</span>
                  <UBadge
                    v-if="method.badge"
                    :label="method.badge.label"
                    :color="method.badge.color"
                    size="xs"
                  />
                </div>
                <p class="text-xs text-gray-400 truncate">
                  {{ method.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Banner bảo mật -->
        <div class="rounded-xl bg-blue-950 border border-blue-800 p-4 flex gap-2 items-start">
          <UIcon
            name="i-lucide-shield-check"
            class="text-blue-400 mt-0.5 shrink-0"
          />
          <div>
            <p class="font-semibold text-sm text-white">
              An toàn & Bảo mật
            </p>
            <p class="text-xs text-gray-400 mt-1">
              Mọi giao dịch nạp tiền tại HSEC đều được mã hóa đầu cuối và kiểm soát bởi hệ thống AI 24/7.
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        label="Trung tâm hỗ trợ"
        icon="i-lucide-headset"
        color="neutral"
        variant="soft"
        class="w-full flex justify-center  py-3 transition shadow-lg hover:shadow-xl"
      />
    </template>
  </UModal>
</template>

<script lang="ts" setup>
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'select-method', methodKey: any): void
}>()

const currencies = [
  { code: 'VND', name: 'Đồng Việt Nam', flag: 'https://flagcdn.com/w40/vn.png' },
  { code: 'AMD', name: 'Dram Armenia', flag: 'https://flagcdn.com/w40/am.png' },
  { code: 'AUD', name: 'Đô la Úc', flag: 'https://flagcdn.com/w40/au.png' },
  { code: 'BYN', name: 'Rúp Belarus', flag: 'https://flagcdn.com/w40/by.png' },
  { code: 'GEL', name: 'Lari Georgia', flag: 'https://flagcdn.com/w40/ge.png' },
  { code: 'IDR', name: 'Rupiah Indonesia', flag: 'https://flagcdn.com/w40/id.png' }
]

const selectedCurrency = ref(currencies[0])

const currencyMenuItems = computed(() => [
  currencies.map(currency => ({
    label: currency.code,
    ...currency
  }))
])

const paymentGroups = computed(() => [
  {
    label: 'Pháp định (Fiat)',
    methods: [
      {
        key: 'bank_transfer',
        title: 'Chuyển khoản Ngân hàng',
        description: 'Nạp VND nhanh qua QR Code hoặc số tài khoản.',
        icon: 'i-lucide-credit-card',
        badge: { label: 'Nhanh nhất', color: 'success' as const }
      },
      {
        key: 'p2p',
        title: 'Giao dịch P2P',
        description: 'Mua Crypto trực tiếp từ người bán uy tín.',
        icon: 'i-lucide-users',
        badge: { label: 'Tỉ giá tốt', color: 'secondary' as const }
      }
    ]
  },
  {
    label: 'Tài sản số',
    methods: [
      {
        key: 'onchain',
        title: 'Nạp On-chain',
        description: 'Nạp qua mạng lưới BTC, ETH, BSC, SOL...',
        icon: 'i-lucide-download',
        badge: { label: 'Bảo mật', color: 'info' as const }
      }
    ]
  }
])
</script>

<style></style>
