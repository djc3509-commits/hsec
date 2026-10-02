<script lang="ts" setup>
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { StaffRole, StaffStatus, type Member } from '~/pages/settings/members.types'

const { copy } = useCopy()

defineProps<{
  members: Member[]
}>()

// --- 1. CẤU HÌNH DROPDOWN MENU ---
const items = [{
  label: 'Edit member',
  color: 'error' as const,
  onSelect: () => {}
}] satisfies DropdownMenuItem[]

// --- 2. HÀM HELPER (QUAN TRỌNG: MAPPING KEY -> VALUE) ---

// Helper: Chuyển đổi Key DB ('SUPER_ADMIN') -> Value Enum ('Super Admin')
const formatRole = (dbKey: string): string => {
  // Ép kiểu để TypeScript hiểu dbKey là một key hợp lệ của StaffRole
  return StaffRole[dbKey as keyof typeof StaffRole] || dbKey
}

// Helper: Chuyển đổi Key DB ('ACTIVE') -> Value Enum ('Active')
const formatStatus = (dbKey: string): string => {
  return StaffStatus[dbKey as keyof typeof StaffStatus] || dbKey
}

// --- 3. HÀM STYLE (MAPPING KEY -> MÀU SẮC) ---

// Định dạng màu cho status (So sánh với Key DB)
function getStatusColor(status: string) {
  return status === 'ACTIVE' ? 'primary' : 'neutral'
}

// Định dạng màu cho Role (So sánh với Key DB)
const getRoleStyle = (role: string) => {
  // LƯU Ý: Case ở đây là KEY trả về từ Database (SUPER_ADMIN)
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-400/10 dark:text-purple-400 ring-1 ring-inset ring-purple-700/20 dark:ring-purple-400/20'

    case 'RISK_CONTROL':
      return 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400 ring-1 ring-inset ring-red-600/20 dark:ring-red-400/20'

    case 'OPERATION':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-400 ring-1 ring-inset ring-cyan-700/20 dark:ring-cyan-400/20'

    case 'BROKER':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/25 dark:ring-emerald-400/20'

    case 'ACCOUNTANT':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-400 ring-1 ring-inset ring-amber-600/25 dark:ring-amber-400/20'

    case 'IT_SUPPORT':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-400/10 dark:text-gray-400 ring-1 ring-inset ring-gray-500/20 dark:ring-gray-400/20'

    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-400/10 dark:text-gray-400 ring-1 ring-inset ring-gray-500/20 dark:ring-gray-400/20'
  }
}

// --- 4. CẤU HÌNH TABLE COLUMNS ---
const UCheckbox = resolveComponent('UCheckbox')
const UAvatar = resolveComponent('UAvatar')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')
const table = useTemplateRef('table')

const columns: TableColumn<Member>[] = [
  {
    id: 'select',
    header: ({ table }) => h(UCheckbox, {
      'modelValue': table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
      'aria-label': 'Select all'
    }),
    cell: ({ row }) => h(UCheckbox, {
      'modelValue': row.getIsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
      'aria-label': 'Select row'
    }),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'id',
    header: () => h('span', { class: ' font-semibold  text-base' }, 'ID'),
    cell: ({ row }) => h('div', {
      class: 'flex flex-col gap-1 min-w-0 flex-1'
    },
    [
      h('span', {
        class: 'text-base font-semibold text-gray-900 dark:text-highlighted truncate cursor-pointer hover:text-primary',
        onClick: () => copy(row.original.employee_code, row.original.id)
      },
      row.original.employee_code
      ),
      h('p', {
        class: 'text-gray-400 dark:text-muted cursor-pointer hover:text-primary',
        onClick: () => copy(row.original.id, row.original.id)
      }, `#${row.original.id}`)
    ])

  },
  {
    accessorKey: 'name',
    header: () => h('span', { class: ' font-semibold text-base' }, 'Name'),
    cell: ({ row }) => h('div', {
      class: 'flex items-center gap-3 min-w-0 '
    }, [
      h(UAvatar, {
        src: row.original.avatar,

        // Thêm alt cho chuẩn bài (dùng tên user)
        alt: row.original.name,

        // Size nếu cần
        size: 'sm'
      }),
      h('div', {
        class: 'min-w-0'
      }, [
        h('span', {
          class: 'text-base font-semibold text-gray-900 dark:text-highlighted truncate cursor-pointer hover:text-primary',
          onClick: () => copy(row.original.name, row.original.id)
        },
        row.original.name
        ),
        h('p', {
          class: 'text-gray-400 dark:text-muted cursor-pointer hover:text-primary',
          onClick: () => copy(row.original.username, row.original.id)
        },
        row.original.username
        )
      ])

    ]),
    size: 250 // Giảm size xuống cho hợp lý hơn
  },
  {
    accessorKey: 'phone',
    header: () => h('span', { class: 'font-semibold text-base' }, 'Phone'),
    cell: ({ row }) => h('span', {
      class: 'text-base font-semibold text-gray-500 dark:text-highlighted truncate cursor-pointer hover:text-primary',
      onClick: () => copy(row.original.phone, row.original.id)
    }, row.original.phone)
  },
  {
    accessorKey: 'email',
    header: () => h('span', { class: 'font-semibold text-base' }, 'Email'),
    cell: ({ row }) => h('span', {
      class: 'text-base text-gray-700 dark:text-gray-300 truncate cursor-pointer hover:text-primary', // Giảm text-lg xuống text-base cho đều
      onClick: () => copy(row.original.email, row.original.id)
    }, row.original.email)
  },
  {
    accessorKey: 'status',
    header: () => h('span', { class: 'font-semibold text-base' }, 'Status'),
    cell: ({ row }) =>
      h(UBadge, {
        color: getStatusColor(row.original.status),
        variant: 'subtle',
        class: 'capitalize min-w-28 justify-center font-medium'
      },
      () => formatStatus(row.original.status))
  },
  {
    accessorKey: 'joined_at',
    header: () => h('span', { class: 'font-semibold text-base' }, 'Date'),
    cell: ({ row }) => {
      const date = new Date(row.getValue('joined_at'))

      return date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour12: false
      })
    }

  },
  {
    accessorKey: 'last_active',
    header: () => h('span', { class: 'font-semibold text-base' }, 'Last Active'),
    cell: ({ row }) => h('span', {
      class: 'dark:text-gray-100 text-gray-700'
    }, row.original.last_active)
  },
  {
    accessorKey: 'role',
    header: () => h('div', {
      class: 'flex w-full'
    }, [
      h('span', {
        class: 'w-[152px] ml-auto text-left font-semibold text-base'
      }, 'Role')
    ]),

    cell: ({ row }) => h('div', {
      class: 'flex w-full'
    }, [
      h('div', {
        class: 'w-[160px] ml-auto flex items-center justify-start gap-3'
      }, [
        h(UBadge, {
          // SỬA: getRoleStyle nhận vào row.original.role (Key DB) để trả về class màu
          class: ['capitalize w-28 justify-center font-medium',
            getRoleStyle(row.original.role)
          ],
          variant: 'subtle' // Thêm variant subtle cho chắc chắn
        },
        // SỬA: formatRole nhận vào row.original.role (Key DB) để hiển thị Value Enum
        () => formatRole(row.original.role)
        ),
        h(UDropdownMenu, {
          items,
          content: { align: 'end' }
        }, [
          h(UButton, {
            icon: 'i-lucide-ellipsis-vertical',
            color: 'neutral',
            variant: 'ghost',
            size: 'xs',
            class: 'group-hover:opacity-100 transition-opacity'
          })
        ])
      ])
    ])
  }
]
</script>

<template>
  <div class="flex-1 divide-y divide-accented w-full">
    <UTable
      ref="table"
      :data="members"
      :columns="columns"
      :ui="{
        th: 'px-4 py-3.5',
        td: 'p-3'
      }"
      sticky
      class="max-h-[72.10vh]"
    >
      <template #expanded="{ row }">
        <pre>{{ row.original }}</pre>
      </template>
    </UTable>

    <div class="px-4 py-3.5 text-sm text-muted">
      {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
      {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s) selected.
    </div>
  </div>
</template>
