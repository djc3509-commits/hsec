<template>
  <UModal
    v-model:open="open"
    fullscreen
    :close="false"
    :ui="{ body: 'p-0 overflow-hidden' }"
  >
    <template #body>
      <div class="flex h-full relative overflow-hidden">
        <!-- Glow decorations -->
        <div class="absolute top-0 left-0 w-150 h-150 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div
          class="absolute bottom-0 right-0 w-100 h-100 bg-secondary/5 rounded-full blur-[100px] pointer-events-none"
        />

        <!-- ── LEFT PANEL ── -->
        <div class="flex flex-col w-1/2 px-16 py-10 relative z-10 bg-elevated/50 border-r border-default">
          <!-- Heading -->
          <div class="mb-10">
            <h1 class="text-5xl font-black text-highlighted leading-tight mb-3 tracking-tight">
              {{ t('wallets.recharge.heading_1') }}
            </h1>
            <h1
              class="text-5xl font-black leading-tight tracking-tight mb-6"
              style="background: linear-gradient(135deg, #3b82f6, #60a5fa, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"
            >
              {{ t('wallets.recharge.heading_2') }}
            </h1>
            <p class="text-muted text-sm leading-relaxed max-w-xs">
              {{ t('wallets.recharge.subtitle') }}
            </p>
          </div>

          <!-- Market trend -->
          <div class="mb-8">
            <p class="text-[10px] font-bold text-dimmed tracking-[0.15em] uppercase mb-4 flex items-center gap-2">
              <span class="w-3 h-px bg-accented" />
              {{ t('wallets.recharge.market_trend') }}
            </p>
            <div class="flex flex-col gap-2">
              <div
                v-for="coin in marketCoins"
                :key="coin.symbol"
                class="flex items-center justify-between px-4 py-3 rounded-xl bg-elevated ring ring-default hover:bg-accented transition-colors"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0"
                    :style="{ background: coin.color }"
                  >
                    {{ coin.symbol[0] }}
                  </div>
                  <div>
                    <p class="text-highlighted text-xs font-bold">
                      {{ coin.name }}
                    </p>
                    <p class="text-dimmed text-[10px]">
                      {{ coin.symbol }}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-highlighted text-xs font-semibold tabular-nums">
                    {{ coin.price }}
                  </p>
                  <p
                    class="text-[10px] font-semibold tabular-nums"
                    :class="coin.change > 0 ? 'text-success' : 'text-error'"
                  >
                    {{ coin.change > 0 ? '+' : '' }}{{ coin.change }}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Security notice -->
          <UAlert
            class="mt-auto"
            icon="i-heroicons-shield-check"
            color="info"
            variant="soft"
            description="HSEC cam kết bảo mật 100% tài sản nạp. Mọi sự cố kỹ thuật sẽ được xử lý trong vòng 30 phút."
          />
        </div>

        <!-- ── RIGHT PANEL ── -->
        <div class="flex items-center justify-center w-1/2 px-10 py-10 relative z-10">
          <div class="w-full max-w-md flex flex-col gap-3">
            <!-- Form card -->
            <div class="bg-elevated rounded-2xl ring ring-default overflow-hidden shadow-2xl">
              <!-- Card header -->
              <div class="px-6 pt-6 pb-4 border-b border-default flex items-start justify-between">
                <div>
                  <p class="text-highlighted font-black text-base">
                    Cấu hình khoản nạp
                  </p>
                  <p class="text-[10px] text-dimmed font-semibold tracking-widest uppercase mt-0.5">
                    Giao dịch tự động
                    P2P
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-[10px] text-dimmed uppercase tracking-wide font-semibold">
                    Số dư hiện tại
                  </p>
                  <p class="text-primary font-semibold text-base tabular-nums">
                    ${{ formatPrice(wallet.cashBalance) }}
                  </p>
                </div>
              </div>

              <div class="px-6 py-5 flex flex-col gap-4">
                <!-- VND Input -->
                <div>
                  <div class="flex items-center justify-between mb-2.5 px-1">
                    <label class="text-xs font-semibold text-muted">Bạn chi trả</label>
                    <span class="text-xs text-dimmed font-medium">Hạn mức: 150,000 - 560,000,000 ₫</span>
                  </div>

                  <UInput
                    v-model="vndAmount"
                    type="number"
                    placeholder="0"
                    size="xl"
                    variant="soft"
                    color="primary"
                    :ui="{
                      base: 'font-semibold text-4xl tabular-nums',
                      trailing: 'pe-2'
                    }"
                    @update:model-value="calcUsdt"
                  >
                    <template #trailing>
                      <UButton
                        variant="outline"
                        color="neutral"
                        size="sm"
                        class="rounded-full gap-2.5 pointer-events-auto"
                        trailing-icon="i-heroicons-chevron-down"
                      >
                        <template #leading>
                          <div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                            <span class="text-white text-[9px] font-semibold">₫</span>
                          </div>
                        </template>
                        VND
                      </UButton>
                    </template>
                  </UInput>

                  <!-- Quick amounts -->
                  <div class="grid grid-cols-4 gap-2 mt-3">
                    <UButton
                      v-for="amt in quickAmounts"
                      :key="amt.value"
                      :label="amt.label"
                      size="xs"
                      :color="vndAmount === amt.value ? 'primary' : 'neutral'"
                      :variant="vndAmount === amt.value ? 'solid' : 'outline'"
                      block
                      @click="vndAmount = amt.value; calcUsdt()"
                    />
                  </div>
                </div>

                <!-- Arrow divider -->
                <div class="flex justify-center">
                  <div class="w-8 h-8 rounded-full bg-primary/10 ring ring-primary/30 flex items-center justify-center">
                    <UIcon
                      name="i-heroicons-arrow-down"
                      class="w-4 h-4 text-primary"
                    />
                  </div>
                </div>

                <!-- USDT result -->
                <div class="flex items-center justify-between px-4 py-4 rounded-xl bg-success/5 ring ring-success/20">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full bg-[#1ba27a] flex items-center justify-center text-white font-black text-xs shrink-0"
                    >
                      S
                    </div>
                    <div>
                      <p class="text-[10px] text-dimmed font-semibold uppercase tracking-wide">
                        Bạn sẽ nhận được
                      </p>
                      <p class="text-highlighted font-semibold text-lg tabular-nums">
                        ≈ <span class="text-success">{{ usdtResult }}</span>
                        <span class="text-sm text-muted"> USDT</span>
                      </p>
                    </div>
                  </div>
                  <UBadge
                    label="Tỷ giá tốt"
                    color="success"
                    variant="soft"
                    leading-icon="i-heroicons-check-circle"
                    size="xs"
                  />
                </div>

                <!-- Payment methods -->
                <div>
                  <label class="text-[10px] font-bold text-muted uppercase tracking-widest block mb-2">
                    Phương thức nạp
                  </label>
                  <div
                    v-for="method in paymentMethods"
                    :key="method.id"
                    class="flex items-center justify-between px-4 py-3.5 rounded-xl ring cursor-pointer transition-all"
                    :class="selectedMethod === method.id
                      ? 'bg-primary/5 ring-primary/40'
                      : 'bg-elevated ring-default hover:bg-accented'"
                    @click="selectedMethod = method.id"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        class="w-9 h-9 rounded-lg bg-primary/10 ring ring-primary/20 flex items-center justify-center"
                      >
                        <UIcon
                          :name="method.icon"
                          class="w-4.5 h-4.5 text-primary"
                        />
                      </div>
                      <div>
                        <p class="text-highlighted text-sm font-bold">
                          {{ method.name }}
                        </p>
                        <p class="text-dimmed text-[11px]">
                          {{ method.desc }}
                        </p>
                      </div>
                    </div>
                    <!-- Radio indicator -->
                    <div
                      class="w-5 h-5 rounded-full ring-2 flex items-center justify-center transition-all"
                      :class="selectedMethod === method.id ? 'ring-primary bg-primary' : 'ring-muted'"
                    >
                      <div
                        v-if="selectedMethod === method.id"
                        class="w-2 h-2 rounded-full bg-white"
                      />
                    </div>
                  </div>
                </div>

                <!-- Submit button -->
                <UButton
                  label="Xác nhận nạp tiền"
                  color="primary"
                  variant="solid"
                  size="lg"
                  block
                  :loading="isDepositing"
                  :disabled="isDepositing || !vndAmount || vndAmount < 100000"
                  :ui="{ base: 'font-black tracking-widest uppercase' }"
                  @click="doDeposit"
                />

                <!-- Trust badges -->
                <div class="flex items-center justify-center gap-6 pt-1">
                  <div class="flex items-center gap-1.5 text-[10px] text-dimmed font-semibold">
                    <UIcon
                      name="i-heroicons-lock-closed"
                      class="w-3 h-3"
                    />
                    PCI-DSS
                  </div>
                  <USeparator
                    orientation="vertical"
                    class="h-3"
                  />
                  <div class="flex items-center gap-1.5 text-[10px] text-dimmed font-semibold">
                    <UIcon
                      name="i-heroicons-chat-bubble-left-ellipsis"
                      class="w-3 h-3"
                    />
                    Support 24/7
                  </div>
                </div>
              </div>
            </div>

            <!-- Toast notification -->
            <Transition
              enter-from-class="opacity-0 translate-y-2"
              enter-active-class="transition-all duration-300"
              leave-to-class="opacity-0"
            >
              <div
                v-if="toast.message"
                class="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm"
                :class="toast.success
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'"
              >
                <UIcon
                  :name="toast.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                  class="h-4 w-4 shrink-0"
                />
                <span class="leading-5">{{ toast.message }}</span>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
const { t } = useI18n()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'deposited'): void
}>()

const props = defineProps<{
  open: boolean
  wallet: { cashBalance: number, coinBalance: number, coinSymbol: string }
}>()

// v-model relay
const open = computed({
  get: () => props.open,
  set: v => emit('update:open', v)
})

const marketCoins = [
  { symbol: 'BTC', name: 'Bitcoin', price: '$66,911.21', change: +67.28, color: '#f97316' },
  { symbol: 'ETH', name: 'Ethereum', price: '$2,053.30', change: +2.57, color: '#6366f1' },
  { symbol: 'SOL', name: 'Solana', price: '$80.30', change: +1.21, color: '#8b5cf6' }
]

const quickAmounts = [
  { label: '500K', value: 500000 },
  { label: '1 triệu', value: 1000000 },
  { label: '2.5tr', value: 2500000 },
  { label: '5 triệu', value: 5000000 }
]

const paymentMethods = [
  { id: 'bank', name: 'Chuyển khoản (Auto)', desc: 'Xử lý trong 1-3 phút', icon: 'i-heroicons-credit-card' }
]

const vndAmount = ref<number | null>(null)
const usdtResult = ref('0.00')
const selectedMethod = ref('bank')
const isDepositing = ref(false)
const toast = reactive({ message: '', success: false })

const RATE = 25450

function calcUsdt() {
  if (!vndAmount.value || vndAmount.value <= 0) { usdtResult.value = '0.00'; return }
  usdtResult.value = (vndAmount.value / RATE).toFixed(2)
}

function showToast(message: string, success: boolean) {
  toast.message = message
  toast.success = success
  setTimeout(() => { toast.message = '' }, 3500)
}

async function doDeposit() {
  if (!vndAmount.value || vndAmount.value < 100000) return
  isDepositing.value = true
  try {
    const usdtAmount = parseFloat(usdtResult.value)
    await $fetch('/api/wallet/deposit', {
      method: 'POST',
      body: { amount: usdtAmount, currency: 'USDT', paymentMethod: selectedMethod.value }
    })
    showToast(`Nạp thành công ${usdtAmount.toFixed(2)} USDT!`, true)
    emit('deposited')
    setTimeout(() => emit('update:open', false), 1500)
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Nạp thất bại, thử lại', false)
  } finally {
    isDepositing.value = false
  }
}
</script>

<style scoped>
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none
}

input[type=number] {
  appearance: textfield;
  -moz-appearance: textfield;
}
</style>
