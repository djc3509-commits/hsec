<template>
  <div>
    <UPageCard
      title="Members"
      description="Invite new members by email address."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <div class="flex gap-2 justify-end">
        <UButton
          class="cursor-pointer"
          icon="bi:funnel-fill"
          color="neutral"
          @click="showFilter = !showFilter"
        />
        <UButton
          class="cursor-pointer"
          label="Invite people"
          color="neutral"
        />
      </div>
    </UPageCard>

    <UPageCard
      variant="subtle"
      :ui="{ container: 'p-0 mb-1 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }"
    >
      <template #header>
        <UInput
          v-model="q"
          icon="i-lucide-search"
          placeholder="Search members"
          autofocus
          class="w-full"
        />
      </template>

      <SettingsMembersList :members="filteredMembers" />
    </UPageCard>
    <more-fillters
      v-model:open="showFilter"
      @apply="onApplyFilter"
    />
  </div>
</template>

<script lang="ts" setup>
import MoreFillters from '~/components/settings/more-fillters.vue'
import { FILTER_CONFIG, StaffStatus, type StaffRole, type Member, type MembersFilter } from './members.types'

// ⚠️ MOCK DATA — chưa wire vào DB thật, sẽ làm sau khi xử lý settings module
const members = ref<Member[]>([
  {
    id: 'M001', employee_code: 'EMP001', name: 'Nguyễn Văn An', username: 'an.nv',
    email: 'an.nv@HSEC.io', phone: '0901234567', status: StaffStatus.ACTIVE,
    role: 'SUPER_ADMIN' as unknown as StaffRole, joined_at: '2024-01-15', last_active: 'Just now',
    avatar: { src: 'https://i.pravatar.cc/150?img=12' }
  },
  {
    id: 'M002', employee_code: 'EMP002', name: 'Trần Thị Bình', username: 'binh.tt',
    email: 'binh.tt@HSEC.io', phone: '0902345678', status: StaffStatus.ACTIVE,
    role: 'RISK_CONTROL' as unknown as StaffRole, joined_at: '2024-02-20', last_active: '5m ago',
    avatar: { src: 'https://i.pravatar.cc/150?img=45' }
  },
  {
    id: 'M003', employee_code: 'EMP003', name: 'Lê Hoàng Cường', username: 'cuong.lh',
    email: 'cuong.lh@HSEC.io', phone: '0903456789', status: StaffStatus.ACTIVE,
    role: 'OPERATION' as unknown as StaffRole, joined_at: '2024-03-10', last_active: '1h ago',
    avatar: { src: 'https://i.pravatar.cc/150?img=33' }
  },
  {
    id: 'M004', employee_code: 'EMP004', name: 'Phạm Thu Dung', username: 'dung.pt',
    email: 'dung.pt@HSEC.io', phone: '0904567890', status: StaffStatus.INACTIVE,
    role: 'BROKER' as unknown as StaffRole, joined_at: '2024-04-05', last_active: '2d ago',
    avatar: { src: 'https://i.pravatar.cc/150?img=24' }
  },
  {
    id: 'M005', employee_code: 'EMP005', name: 'Võ Minh Đức', username: 'duc.vm',
    email: 'duc.vm@HSEC.io', phone: '0905678901', status: StaffStatus.ACTIVE,
    role: 'ACCOUNTANT' as unknown as StaffRole, joined_at: '2024-05-12', last_active: '30m ago',
    avatar: { src: 'https://i.pravatar.cc/150?img=58' }
  }
])

// Khai báo biến tìm kiếm
const q = ref('')

// Khai báo biến filter
const currentFilter = ref<MembersFilter>({})

// Sửa return type thành string[] (Bỏ undefined)
const splitToArray = (val: unknown): string[] => {
  if (typeof val === 'string' && val.trim()) {
    return val.split(/[\n, ]+/).filter(Boolean)
  }
  return [] // Luôn trả về mảng, an toàn tuyệt đối
}

// Computed 1: Chỉ làm nhiệm vụ chuẩn bị "Luật chơi" (Rules)
const activeFilterRules = computed(() => {
  const rawFilter = currentFilter.value // Dữ liệu thô (String)

  return Object.entries(FILTER_CONFIG)
    .map(([key, config]) => {
      // Ép kiểu key cho đúng với key của Raw Filter
      const filterKey = key as keyof typeof rawFilter
      const rawValue = rawFilter[filterKey]

      // 1. Kiểm tra rác (Validation)
      if (rawValue === undefined || rawValue === null) {
        return null
      }

      // 2. Chuyển đổi dữ liệu (Transformation)
      let finalValue: string | string[] | number | boolean = rawValue

      // Nếu config bảo là array -> Cắt chuỗi
      if (config.type === 'array') {
        const arr = splitToArray(rawValue)
        if (arr.length === 0) return null // Cắt ra rỗng -> Bỏ qua
        finalValue = arr
      }

      // 3. Trả về Rule sạch
      return {
        memberKey: config.memberKey, // Key để đối chiếu bên Member (vd: 'id', 'email')
        value: finalValue, // Giá trị đã làm sạch (Array hoặc Value đơn)
        type: config.type // Kiểu so sánh ('array' hoặc 'value')
      }
    })
    .filter((rule): rule is NonNullable<typeof rule> => rule !== null) // Lọc bỏ null
})

// Computed 2: Chỉ làm nhiệm vụ chạy vòng lặp và so sánh (Execution)
const filteredMembers = computed<Member[]>(() => {
  // Guard clause: Nếu không có data thì trả về rỗng ngay
  if (!members.value) return []

  const list = members.value as Member[]
  const searchText = q.value.toLowerCase().trim()

  // Lấy bộ luật đã được xử lý sạch sẽ ở Computed 1
  const rules = activeFilterRules.value

  return list.filter((member) => {
    // A. Global Search (Fail fast - Kiểm tra trước để loại sớm)
    if (searchText) {
      const matchSearch = Object.values(member).some(val => (typeof val === 'string' || typeof val === 'number') && String(val).toLowerCase().includes(searchText))
      if (!matchSearch) return false
    }

    // B. Dynamic Rules Check (Chạy cực nhanh vì rules đã sạch)
    return rules.every((rule) => {
      // Lấy giá trị thực tế của Member
      const memberVal = member[rule.memberKey as keyof Member]

      if (rule.type === 'array') {
        // So sánh 1: Mảng Filter có chứa giá trị Member không?
        // Ép String(memberVal) để an toàn khi so sánh với mảng string[]
        return (rule.value as string[]).includes(String(memberVal))
      } else {
        // So sánh 2: Bằng tuyệt đối (cho Role, Status)
        return memberVal === rule.value
      }
    })
  })
})

function onApplyFilter(filter: MembersFilter) {
  currentFilter.value = {
    ...currentFilter.value,
    ...filter
  }
}
const showFilter = ref(false)
</script>

<style></style>
