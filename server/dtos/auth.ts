// ─────────────────────────────────────────────────────────────
// AUTH DTO — Hợp đồng kiểu dữ liệu cho domain `auth`.
// Zod schema làm 1 nguồn duy nhất cho client + server validate.
// Response type: User KHÔNG bao giờ chứa password_hash.
// ─────────────────────────────────────────────────────────────
import { z } from 'zod'

// ── REQUEST SCHEMAS (client → server) ──────────────────────

export const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự')
})

export type LoginRequest = z.infer<typeof LoginSchema>

export const RegisterSchema = z.object({
  username: z.string().min(3, 'Username ≥ 3 ký tự').max(20, 'Username ≤ 20 ký tự'),
  fullname: z.string().min(2, 'Họ tên ≥ 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu ≥ 8 ký tự')
})

export type RegisterRequest = z.infer<typeof RegisterSchema>

// ── RESPONSE TYPES (server → client) ───────────────────────

/** User public — không bao giờ chứa password_hash. */
export interface User {
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
  lastActiveChatId: string | null // ← Con trỏ chat đang xem, lưu trong DB
}

/** Kết quả login/register: trả về user (token đã set qua cookie httpOnly). */
export interface AuthResult {
  user: User
}
