// ─────────────────────────────────────────────────────────────
// USER DTO — Schemas cho cập nhật profile.
// Chỉ field hiện có trong DB: fullname (avatar update qua endpoint riêng).
// ─────────────────────────────────────────────────────────────
import { z } from 'zod'

export const UpdateProfileSchema = z.object({
  fullname: z.string().min(2, 'Họ tên ≥ 2 ký tự').max(100, 'Tối đa 100 ký tự')
})

export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>

export interface AvatarUploadResult {
  avatar: string // URL Cloudinary sau khi upload
}
