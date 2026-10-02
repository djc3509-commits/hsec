<!-- components/orders/history-panel.vue -->
<template>
  <UCard
    :ui="{
      root: 'shrink-0 rounded-none border-x-0 border-b-0 transition-all duration-300 overflow-hidden flex flex-col',
      header: 'p-0 sm:px-0 shrink-0',
      body: 'p-0 sm:p-0 flex flex-col min-h-0 flex-1'
    }"
    :style="{ height: showOrderPanel ? '340px' : '36px' }"
  >
    <!-- Header: tabs + trạng thái -->
    <template #header>
      <div
        class="flex items-center gap-2 px-3 h-9 cursor-pointer select-none"
        @click="toggle"
      >
        <UTabs
          v-model="activeOrderTab"
          :items="ORDER_TABS"
          variant="link"
          size="xs"
          :content="false"
          :ui="{ list: 'border-none gap-0' }"
          @click.stop
          @update:model-value="open()"
        >
          <template #default="{ item }">
            <span>{{ item.label }}</span>
            <UBadge
              v-if="item.value === 'open' && openOrdersCount > 0"
              :label="String(openOrdersCount)"
              color="warning"
              variant="soft"
              size="xs"
              class="ml-1"
            />
          </template>
        </UTabs>

        <div class="ml-auto flex items-center gap-3">
          <UBadge
            color="success"
            variant="subtle"
            size="sm"
            class="gap-1"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {{ lastRefresh }}
          </UBadge>
          <UButton
            :icon="showOrderPanel ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
            color="neutral"
            variant="ghost"
            size="xs"
          />
        </div>
      </div>
    </template>

    <!-- Body: danh sách full, cuộn được -->
    <template
      v-if="showOrderPanel"
      #default
    >
      <div class="flex-1 overflow-y-auto min-h-0 divide-y divide-default">
        <div
          v-if="ordersLoading"
          class="flex items-center justify-center h-full gap-2 text-sm text-muted"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="animate-spin size-4"
          /> Đang tải...
        </div>

        <div
          v-else-if="displayOrders.length === 0"
          class="flex flex-col items-center justify-center h-full gap-2 py-10"
        >
          <UIcon
            name="i-lucide-file-text"
            class="size-6 text-dimmed"
          />
          <span class="text-sm text-muted">Chưa có lệnh nào</span>
        </div>

        <UCollapsible
          v-for="order in displayOrders"
          :key="order.id"
          @update:open="(val: boolean) => onRowToggle(order.id, val)"
        >
          <div class="flex items-center gap-5 px-4 py-3 hover:bg-elevated transition-colors cursor-pointer text-left">
            <!-- Symbol -->
            <div class="flex items-center gap-3 w-44 shrink-0 min-w-0">
              <div
                class="w-1 h-9 rounded-full shrink-0"
                :class="order.side === 'BUY' ? 'bg-success' : 'bg-error'"
              />

              <div class="min-w-0">
                <div class="flex items-center gap-1">
                  <span class="font-semibold text-sm text-highlighted truncate">
                    {{ order.symbol.replace('USDT', '') }}
                  </span>

                  <span class="text-xs text-dimmed">
                    /USDT
                  </span>
                </div>

                <div class="flex items-center gap-1 mt-0.5 text-[11px] text-dimmed">
                  <UIcon
                    name="i-lucide-clock"
                    class="size-3"
                  />

                  {{ fmtDate(order.createdAt) }}
                </div>
              </div>
            </div>

            <!-- Side + Type -->
            <div class="w-28 shrink-0 flex flex-col gap-1">
              <UBadge
                :label="order.side === 'BUY' ? 'Mua vào' : 'Bán ra'"
                :color="order.side === 'BUY' ? 'success' : 'error'"
                variant="soft"
                size="sm"
                class="justify-center"
              />

              <UBadge
                :label="order.type === 'LIMIT'
                  ? 'Giới hạn'
                  : 'Thị trường'"
                color="neutral"
                variant="soft"
                size="sm"
                class="justify-center"
              />
            </div>

            <!-- Price -->
            <div class="w-32 shrink-0 flex justify-end">
              <div class="inline-flex items-baseline gap-1.5 whitespace-nowrap">
                <span class="font-semibold text-sm tabular-nums text-highlighted">
                  {{ formatPrice(order.price) }}
                </span>

                <span class="text-[10px] uppercase tracking-wide text-dimmed font-medium">
                  USDT
                </span>
              </div>
            </div>

            <!-- Progress -->
            <div class="w-44 shrink-0">
              <UProgress
                :model-value="progressPct(order)"
                status
                size="sm"
                :color="order.side === 'BUY'
                  ? 'success'
                  : 'error'"
              >
                <template #status>
                  <span class="text-[11px] text-muted tabular-nums">
                    {{ formatPrice(order.executedQuantity) }}
                    /
                    {{ formatPrice(order.quantity) }}
                  </span>
                </template>
              </UProgress>
            </div>

            <!-- Status -->
            <div class="w-28 shrink-0 flex justify-center">
              <UBadge
                :label="ORDER_STATUS_LABEL[order.status as OrderStatus]"
                :color="ORDER_STATUS_COLOR[order.status as OrderStatus]"
                variant="subtle"
                size="sm"
                class="justify-center min-w-24"
              />
            </div>

            <div class="flex-1" />

            <!-- Cancel -->
            <UButton
              v-if="order.status === 'PENDING' || order.status === 'PARTIALLY_FILLED'"
              label="Hủy"
              color="error"
              variant="soft"
              size="xs"
              class="shrink-0"
              :loading="cancellingId === order.id"
              @click.stop="onCancel(order.id)"
            />

            <!-- Arrow -->
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 shrink-0 text-dimmed transition-transform duration-200"
            />
          </div>

          <template #content>
            <div class="px-3 pb-3 pt-1 bg-elevated/50">
              <div
                v-if="loadingDetailId === order.id"
                class="flex items-center justify-center py-6 gap-2 text-sm text-muted"
              >
                <UIcon
                  name="i-lucide-loader-2"
                  class="animate-spin size-4"
                /> Đang tải chi tiết...
              </div>

              <template v-else-if="orderDetails.get(order.id)">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <UCard :ui="{ body: 'p-3 space-y-1.5' }">
                    <template #header>
                      <span class="text-xs font-semibold text-dimmed uppercase tracking-wide">Chi tiết khớp lệnh</span>
                    </template>

                    <div class="flex justify-between items-center text-sm">
                      <span class="text-muted">Mã lệnh</span>
                      <div class="flex items-center gap-1">
                        <span class="font-semibold">#{{ order.id }}</span>
                        <UButton
                          icon="i-lucide-clipboard"
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          @click.stop="copy(order.id)"
                        />
                      </div>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-muted">{{ order.status === 'FILLED' ? 'Khớp lúc' : 'Lần khớp cuối' }}</span>
                      <span class="font-semibold">
                        {{ orderDetails.get(order.id)!.lastMatchedAt
                          ? fmtDate(orderDetails.get(order.id)!.lastMatchedAt!) : '—' }}
                      </span>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                      <span class="text-muted">Vai trò</span>
                      <UBadge
                        v-if="orderDetails.get(order.id)!.lastRole"
                        :label="orderDetails.get(order.id)!.lastRole === 'MAKER' ? 'Maker' : 'Taker'"
                        color="neutral"
                        variant="soft"
                        size="sm"
                      />
                      <span
                        v-else
                        class="text-dimmed"
                      >—</span>
                    </div>
                  </UCard>

                  <UCard :ui="{ body: 'p-3' }">
                    <template #header>
                      <span class="text-xs font-semibold text-dimmed uppercase tracking-wide">
                        {{ order.status === 'FILLED' ? 'Tổng kết tài chính' : 'Tạm tính tài chính' }}
                      </span>
                    </template>

                    <div class="grid grid-cols-2 gap-y-2 text-sm">
                      <template v-if="order.side === 'BUY'">
                        <div>
                          <span class="text-dimmed block text-xs">Đã chi{{ order.status !== 'FILLED' ? ' (tạm)' : ''
                          }}</span>
                          <span class="font-semibold">
                            {{ formatPrice(orderDetails.get(order.id)!.totalFilledValue
                              + orderDetails.get(order.id)!.totalFeeUsdt) }} USDT
                          </span>
                        </div>
                        <div>
                          <span class="text-dimmed block text-xs">Đã nhận</span>
                          <span class="font-semibold text-success">
                            +{{ formatPrice(orderDetails.get(order.id)!.totalReceivedQty) }} {{
                              order.symbol.replace('USDT', '')
                            }}
                          </span>
                        </div>
                        <div>
                          <span class="text-dimmed block text-xs">Phí giao dịch{{ order.status !== 'FILLED' ? ' (tạm)'
                            : '' }}</span>
                          <span class="font-semibold text-error">
                            -{{ formatPrice(orderDetails.get(order.id)!.totalFeeUsdt) }} USDT
                          </span>
                        </div>
                        <div>
                          <span class="text-dimmed block text-xs">
                            {{ order.status === 'FILLED' ? 'Thực nhận' : 'Còn lại cần khớp' }}
                          </span>
                          <span class="font-semibold">
                            {{ order.status === 'FILLED'
                              ? formatPrice(orderDetails.get(order.id)!.totalReceivedQty) + ' '
                                + order.symbol.replace('USDT', '')
                              : formatPrice(order.quantity - order.executedQuantity) + ' ' + order.symbol.replace('USDT',
                                                                                                                  '')
                            }}
                          </span>
                        </div>
                      </template>

                      <template v-else>
                        <div>
                          <span class="text-dimmed block text-xs">Giá trị lệnh{{ order.status !== 'FILLED' ? ' (tạm)'
                            : '' }}</span>
                          <span class="font-semibold">{{ formatPrice(orderDetails.get(order.id)!.totalFilledValue) }}
                            USDT</span>
                        </div>
                        <div>
                          <span class="text-dimmed block text-xs">Đã nhận</span>
                          <span class="font-semibold text-success">
                            +{{ formatPrice(orderDetails.get(order.id)!.totalFilledValue
                              - orderDetails.get(order.id)!.totalFeeUsdt) }} USDT
                          </span>
                        </div>
                        <div>
                          <span class="text-dimmed block text-xs">Phí giao dịch{{ order.status !== 'FILLED' ? ' (tạm)'
                            : '' }}</span>
                          <span class="font-semibold text-error">-{{
                            formatPrice(orderDetails.get(order.id)!.totalFeeUsdt) }}
                            USDT</span>
                        </div>
                        <div>
                          <span class="text-dimmed block text-xs">
                            {{ order.status === 'FILLED' ? 'Thực nhận' : 'Còn lại cần khớp' }}
                          </span>
                          <span class="font-semibold">
                            {{ order.status === 'FILLED'
                              ? formatPrice(orderDetails.get(order.id)!.totalFilledValue
                                - orderDetails.get(order.id)!.totalFeeUsdt) + ' USDT'
                              : formatPrice(order.quantity - order.executedQuantity) + ' ' + order.symbol.replace('USDT',
                                                                                                                  '')
                            }}
                          </span>
                        </div>
                      </template>
                    </div>
                  </UCard>
                </div>
              </template>

              <div
                v-else
                class="py-4 text-center text-sm text-muted"
              >
                Không tải được chi tiết lệnh.
                <UButton
                  label="Thử lại"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click.stop="loadDetail(order.id, true)"
                />
              </div>
            </div>
          </template>
        </UCollapsible>
      </div>
    </template>
  </UCard>
</template>

<script lang="ts" setup>
import { useOrderHistory, ORDER_TABS, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '../../composables/orders/useOrderHistory'
import type { Order, OrderStatus } from '../../../server/dtos/order'

const props = defineProps<{ symbol: string }>()
const emit = defineEmits<{ filled: [] }>()

const symbol = toRef(props, 'symbol')
const toast = useToast()
const { copy } = useCopy()
const {
  showOrderPanel, activeOrderTab, displayOrders, ordersLoading, openOrdersCount,
  lastRefresh, cancellingId, cancelOrder, startPolling, stopPolling, open, toggle,
  orderDetails, loadingDetailId, loadDetail
} = useOrderHistory(symbol, () => emit('filled'))

onMounted(startPolling)
onUnmounted(stopPolling)

function progressPct(order: Order): number {
  if (order.quantity <= 0) return 0
  return Math.min(100, Math.round((order.executedQuantity / order.quantity) * 100))
}

function onRowToggle(id: number, isOpen: boolean) {
  if (isOpen) loadDetail(id)
}

async function onCancel(id: number) {
  await cancelOrder(id)
  await loadDetail(id, true)
}

function copyId(id: number) {
  navigator.clipboard?.writeText(String(id))
  toast.add({ title: 'Đã sao chép mã lệnh', icon: 'i-lucide-clipboard-check', color: 'neutral', duration: 2000 })
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

defineExpose({ open })
</script>
