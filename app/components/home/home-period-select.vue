<template>
  <USelect
    v-model="model"
    :items="periods"
    variant="ghost"
    class="data-[state=open]:bg-elevated"
    :ui="{
      value: 'capitalize',
      itemLabel: 'capitalize',
      trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
    }"
  />
</template>

<script lang="ts" setup>
import { eachDayOfInterval } from 'date-fns'
import type { DashboardPeriod as Period, DashboardRange as Range } from '~/composables/home/useHomeDashboard'

const model = defineModel<Period>({ required: true })

const props = defineProps<{
  range: Range
}>()

const dayCount = computed(() => eachDayOfInterval(props.range).length)

const periods = computed<Period[]>(() => {
  if (dayCount.value <= 8) return ['daily']
  if (dayCount.value <= 31) return ['daily', 'weekly']
  if (dayCount.value <= 90) return ['daily', 'weekly', 'monthly']
  // Range rất dài (> 90 ngày): bỏ daily vì quá nhiều điểm
  return ['weekly', 'monthly']
})

// Nếu period hiện tại không còn hợp lệ → reset về option đầu tiên
watch(periods, (newPeriods) => {
  if (!newPeriods.includes(model.value)) {
    model.value = newPeriods[0]!
  }
})
</script>
