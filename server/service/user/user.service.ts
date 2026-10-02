// ─────────────────────────────────────────────────────────────
// USER SERVICE — Đọc user, cập nhật profile, upload avatar.
// Validate request đã làm ở handler (zod) → service tin DTO sạch.
// ─────────────────────────────────────────────────────────────
import { createError } from 'h3'
import { execute, queryOne } from '../../utils/db'
import { uploadToCloud } from '../../utils/cloudinary'
import type { UpdateProfileRequest, AvatarUploadResult } from '../../dtos/user'
import type { User } from '../../dtos/auth'

export interface UserRow {
  id: number
  username: string
  email: string
  fullname: string
  avatar: string | null
  role: 'USER' | 'ADMIN'
  is_active: boolean
  is_expert: boolean
  created_at: string
  updated_at: string
  last_active_chat_id: string | null
}

/** Cột công khai của user — KHÔNG gồm password_hash. */
export const USER_PUBLIC_COLUMNS = 'id, username, email, fullname, avatar, role, is_active, is_expert, created_at, updated_at, last_active_chat_id'

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullname: row.fullname,
    avatar: row.avatar,
    role: row.role,
    is_active: row.is_active,
    is_expert: row.is_expert,
    created_at: row.created_at,
    updated_at: row.updated_at,
    lastActiveChatId: row.last_active_chat_id ?? null
  }
}

export class UserService {
  getById = async (userId: number): Promise<User> => {
    const row = await queryOne<UserRow>(`SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = $1`, [userId])
    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy người dùng' })
    }
    return toUser(row)
  }

  /** Cập nhật profile (hiện chỉ fullname). Trả user mới. */
  updateProfile = async (userId: number, dto: UpdateProfileRequest): Promise<User> => {
    const row = await queryOne<UserRow>(
      `UPDATE users SET fullname = $1, updated_at = now() WHERE id = $2 RETURNING ${USER_PUBLIC_COLUMNS}`,
      [dto.fullname.trim(), userId]
    )
    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy người dùng' })
    }
    return toUser(row)
  }

  /** Upload avatar lên Cloudinary, cập nhật users.avatar, trả URL mới. */
  uploadAvatar = async (userId: number, buffer: Buffer): Promise<AvatarUploadResult> => {
    let url: string
    try {
      url = await uploadToCloud(buffer, 'hsec_avatars')
    } catch (err) {
      console.error('[user.uploadAvatar] Cloudinary error:', err)
      throw createError({ statusCode: 500, statusMessage: 'Upload ảnh thất bại' })
    }

    await execute('UPDATE users SET avatar = $1, updated_at = now() WHERE id = $2', [url, userId])
    return { avatar: url }
  }
}

export const userService = new UserService()
