<template>
  <UModal
    fullscreen
    title="More Filter"
    :ui="{
      footer: 'justify-end',
      content: 'h-full w-80 lg:w-100 ml-auto'
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col grow overflow-hidden gap-2">
        <div
          v-for="(item, index) in filter_config.textListFilters"
          :key="index"
          class="pb-3 mb-4"
        >
          <label class="font-bold block mb-2">{{ item.label }}:</label>
          <UTextarea
            v-model="modalFilter[item.key]"
            color="neutral"
            class="w-full relative"
            :placeholder="item.placeholder"
          >
            <span
              v-if="modalFilter[item.key]"
              variant="soft"
              class="text-red-700 dark:text-red-100 font-semibold text-xs absolute bottom-0 right-0 mr-1 p-1 cursor-pointer "
              @click="modalFilter[item.key] = ''"
            >
              Clear
            </span>
          </UTextarea>
        </div>

        <div
          v-for="(item, index) in filter_config.selectFilters"
          :key="index"
          class="relative  pb-3 mb-4"
        >
          <label class="font-bold block mb-2">{{ item.label }}</label>
          <USelect
            v-model="modalFilter[item.key]"
            :items="item.options"
            color="neutral"
            class="w-full"
            :placeholder="item.placeholder"
          />
          <span
            v-if="modalFilter[item.key]"
            variant="soft"
            class="text-red-700 dark:text-red-100 font-semibold text-xs absolute top-[90%] left-1 cursor-pointer "
            @click="modalFilter[item.key] = undefined"
          >
            Clear
          </span>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        label="Close"
        color="neutral"
        variant="outline"
        @click="emit('update:open', false)"
      />
      <UButton
        label="Apply"
        color="primary"
        variant="solid"
        @click="onAplly"
      />
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import { StaffRole, StaffStatus, type MembersFilter } from '~/pages/settings/members.types'

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'apply', value: MembersFilter): void
}>()

// --- CONFIG ---
const filter_config = computed(() => ({
  textListFilters: [
    {
      key: 'id_members' as const,
      label: 'ID Members',
      placeholder: 'Enter ID Members...'
    },
    {
      key: 'employee_code_members' as const,
      label: 'Employee Code',
      placeholder: 'Enter Employee Code...'
    },
    {
      key: 'phone_members' as const,
      label: 'Phone Member',
      placeholder: 'Enter Phone Numbers...'
    },
    {
      key: 'email_members' as const,
      label: 'Email Member',
      placeholder: 'Enter Emails...'
    }
  ],
  selectFilters: [
    {
      key: 'role_members' as const,
      label: 'Role Members',
      placeholder: 'Select Role...',
      // SỬA Ở ĐÂY: Dùng Object.entries để tách Key và Value
      // entry[0] là Key ('SUPER_ADMIN') -> Dùng để gửi xuống DB
      // entry[1] là Value ('Super Admin') -> Dùng để hiển thị
      options: Object.entries(StaffRole).map(([key, label]) => ({
        label: label,
        value: key
      }))
    },
    {
      key: 'status_members' as const,
      label: 'Status Member',
      placeholder: 'Select Status..',
      // SỬA Ở ĐÂY TƯƠNG TỰ
      options: Object.entries(StaffStatus).map(([key, label]) => ({
        label: label,
        value: key
      }))
    }
  ]
}))

// --- STATE ---
// State local của Modal
const modalFilter = reactive({
  id_members: '',
  employee_code_members: '',
  phone_members: '',
  email_members: '',
  role_members: undefined,
  status_members: undefined
})

// --- ACTIONS ---
function onAplly() {
  const _returnFilters: Record<string, any> = {}

  // Duyệt qua state để làm sạch dữ liệu (Data Sanitization)
  Object.keys(modalFilter).forEach((key) => {
    const thisKey = key as keyof typeof modalFilter
    const value = modalFilter[thisKey]

    // Kiểm tra rỗng (undefined, null, string rỗng, mảng rỗng)
    const isEmpty = value === undefined
      || value === null
      || value === ''
      || (Array.isArray(value) && value.length === 0)

    // Nếu rỗng -> trả về undefined (để Parent biết đường reset)
    // Nếu có giá trị -> trả về nguyên bản (Parent sẽ tự split string thành array)
    _returnFilters[thisKey] = isEmpty ? undefined : value
  })

  // Emit dữ liệu thô ra cha
  emit('apply', _returnFilters)
  emit('update:open', false)
}
</script>

<style></style>
