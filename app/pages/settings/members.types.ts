// ─────────────────────────────────────────────────────────────
// MEMBER TYPES — co-located cùng members.vue.
// Mock data tạm; sẽ thay bằng server/dtos/member.ts khi xử lý settings module.
// Dùng bởi: members.vue, components/settings/more-fillters.vue,
//            components/settings/settings-members-list.vue
// ─────────────────────────────────────────────────────────────
import type { AvatarProps } from '@nuxt/ui'

export enum StaffRole {
  SUPER_ADMIN = 'Super Admin',
  RISK_CONTROL = 'Risk Control',
  OPERATION = 'Operation',
  BROKER = 'Broker',
  ACCOUNTANT = 'Accountant',
  IT_SUPPORT = 'IT Support'
}

export enum StaffStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive'
}

export interface Member {
  id: string
  employee_code: string
  name: string
  username: string
  email: string
  status: StaffStatus
  phone: string
  joined_at: string
  last_active?: string
  role: StaffRole
  avatar: AvatarProps
}

export interface MembersFilter {
  id_members?: string[]
  role_member?: StaffRole
  employee_code_member?: string[]
  phone_member?: string[]
  email_member?: string[]
  status_member?: StaffStatus
}

// Ánh xạ key MembersFilter (UI) sang key Member (data model)
export const FILTER_CONFIG = {
  id_members: { memberKey: 'id', type: 'array' },
  employee_code_members: { memberKey: 'employee_code', type: 'array' },
  phone_members: { memberKey: 'phone', type: 'array' },
  email_members: { memberKey: 'email', type: 'array' },
  role_members: { memberKey: 'role', type: 'value' },
  status_members: { memberKey: 'status', type: 'value' }
} as const
