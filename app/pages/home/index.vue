<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar
        title="Dashboard"
        :ui="{ right: 'gap-3' }"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UTooltip text="Thông báo">
            <UButton
              color="neutral"
              variant="ghost"
              square
            >
              <UChip
                color="error"
                inset
              >
                <UIcon
                  name="i-lucide-bell"
                  class="size-5 shrink-0"
                />
              </UChip>
            </UButton>
          </UTooltip>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" />
          <HomePeriodSelect
            v-model="period"
            :range="range"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- Stats bar — giữ nguyên, component cũ -->
      <HomeStats
        :period="period"
        :range="range"
      />

      <!-- ═══ SKELETON LOAD (mô phỏng layout thật để tránh layout shift) ═══ -->
      <div
        v-if="loading"
        class="flex flex-col gap-6 w-full mt-6"
      >
        <!-- Row 1 skeleton: 2/3 + 1/3 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonChartCard class="lg:col-span-2" />
          <SkeletonChartCard />
        </div>

        <!-- Row 2 skeleton: 2/4 + 1/4 + 1/4 -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <SkeletonChartCard class="lg:col-span-2" />
          <SkeletonChartCard />
          <SkeletonChartCard />
        </div>

        <!-- Row 3 skeleton: table full width -->
        <SkeletonTableCard />
      </div>

      <div
        v-else
        class="flex flex-col gap-6 w-full mt-6"
      >
        <!-- Row 1: Asset chart (2/3) + Order status (1/3) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <HomeAssetChart
            :points="chartPoints"
            :range="range"
            :period="period"
            :loading="loading"
          />
          <HomeOrderStatusChart
            :stats="orderStats"
            :range="range"
            :period="period"
          />
        </div>

        <!-- Row 2: Cashflow (2/4) + Sentiment (1/4) + Popular (1/4) -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <HomeCashFlowChart
            :points="chartPoints"
            :range="range"
            :period="period"
          />
          <HomeMarketSentiment
            :sentiment="sentiment"
            :range="range"
            :period="period"
          />
          <HomePopularCoins
            :coins="popularCoins"
            :loading="loading"
          />
        </div>

        <!-- Row 3: Recent trades (full width) -->
        <HomeRecentTradeTable
          :trades="recentTrades"
          :range="range"
          :period="period"
          :loading="loading"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

<script lang="ts" setup>
import { sub } from 'date-fns'
import type { DashboardPeriod as Period, DashboardRange as Range } from '~/composables/home/useHomeDashboard'
import { useHomeDashboard } from '~/composables/home/useHomeDashboard'

const range = shallowRef<Range>({ start: sub(new Date(), { days: 7 }), end: new Date() })
const period = ref<Period>('daily')

// Composable nhận refs → tự refetch khi đổi range hoặc period (immediate + watch)
const {
  sentiment, orderStats, popularCoins, recentTrades, chartPoints, loading
} = useHomeDashboard(range, period)
</script>
