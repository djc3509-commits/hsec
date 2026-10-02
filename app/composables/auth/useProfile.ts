// composables/auth/useProfile.ts
// Cập nhật profile + upload avatar — tự sync state với useAuth.
import type {
  UpdateProfileRequest, AvatarUploadResult
} from '../../../server/dtos/user'
import type { User } from '../../../server/dtos/auth'

export type { UpdateProfileRequest }

export function useProfile() {
  const { user } = useAuth()

  async function updateProfile(dto: UpdateProfileRequest): Promise<User> {
    const updated = await $fetch<User>('/api/user/profile', {
      method: 'PUT',
      body: dto
    })
    user.value = updated // sync state — UserMenu/Home... tự cập nhật
    return updated
  }

  async function uploadAvatar(file: File): Promise<string> {
    const form = new FormData()
    form.append('avatar', file)
    const res = await $fetch<AvatarUploadResult>('/api/user/avatar', {
      method: 'POST',
      body: form
    })
    // Patch state — chỉ avatar đổi
    if (user.value) {
      user.value = { ...user.value, avatar: res.avatar }
    }
    return res.avatar
  }

  return { updateProfile, uploadAvatar }
}
