// Auth tập trung: 1 nguồn duy nhất cho JWT secret + ký/verify token + lấy userId.
// Thay cho ~13 chỗ copy-paste `jwt.verify(..., process.env.JWT_SECRET || 'your_jwt_secret')`.
import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'
import { getCookie, createError } from 'h3'

// Các giá trị mặc định CÔNG KHAI từng bị hardcode — chặn tuyệt đối để không ai
// vô tình chạy production bằng secret mà cả thế giới đều biết.
const INSECURE_DEFAULTS = new Set(['your_jwt_secret', 'your-secret-key', 'secret', 'changeme'])

/**
 * Đọc JWT secret từ env. KHÔNG có fallback: thiếu/yếu → ném lỗi rõ ràng
 * thay vì âm thầm dùng secret mặc định (ai biết chuỗi đó cũng forge được token).
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || INSECURE_DEFAULTS.has(secret)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'JWT_SECRET chưa được cấu hình an toàn trong .env (đặt một chuỗi ngẫu nhiên ≥ 32 ký tự).'
    })
  }
  return secret
}

export interface AuthPayload {
  id: number
  email: string
}

const TOKEN_TTL = '7d'

/** Ký JWT cho user. Dùng ở /api/auth/login và /api/auth/register. */
export function signAuthToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL })
}

/** Verify 1 token thô → trả payload. Ném lỗi nếu token sai/hết hạn. */
export function verifyAuthToken(token: string): AuthPayload {
  return jwt.verify(token, getJwtSecret()) as AuthPayload
}

/**
 * Bắt buộc request phải đăng nhập hợp lệ → trả về userId.
 * Dùng chung cho mọi endpoint cần auth (ví, lệnh, tài sản, chat...).
 */
export function requireUserId(event: H3Event): number {
  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }
  try {
    return verifyAuthToken(token).id
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Token không hợp lệ hoặc đã hết hạn' })
  }
}
