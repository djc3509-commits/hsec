// ─────────────────────────────────────────────────────────────
// AUTH SERVICE — login, register, me, logout.
// Validate đã làm ở handler (zod) → service tin DTO sạch.
// Cookie auth_token httpOnly do service set/clear.
// ─────────────────────────────────────────────────────────────
import bcrypt from 'bcrypt'
import type { H3Event } from 'h3'
import { setCookie, createError } from 'h3'
import { execute, queryOne, withTransaction } from '../../utils/db'
import { isUuid } from '../../utils/sql'
import { signAuthToken } from '../../utils/auth'
import { USER_PUBLIC_COLUMNS, toUser, userService } from '../user/user.service'
import type { UserRow } from '../user/user.service'
import type { LoginRequest, RegisterRequest, User, AuthResult } from '../../dtos/auth'

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 ngày
const INITIAL_WALLET_BALANCE = 10000 // USDT ảo cho user mới

interface UserWithHashRow extends UserRow {
  password_hash: string
}

export class AuthService {
  login = async (dto: LoginRequest, event: H3Event): Promise<AuthResult> => {
    const row = await queryOne<UserWithHashRow>(
      `SELECT ${USER_PUBLIC_COLUMNS}, password_hash FROM users WHERE email = $1`,
      [dto.email]
    )
    // Cùng một câu báo lỗi cho "sai email" và "sai mật khẩu" — không tiết lộ email nào đã đăng ký.
    if (!row || !(await bcrypt.compare(dto.password, row.password_hash))) {
      throw createError({ statusCode: 401, statusMessage: 'Email hoặc mật khẩu không đúng' })
    }
    if (!row.is_active) {
      throw createError({ statusCode: 403, statusMessage: 'Tài khoản đã bị khoá' })
    }

    const user = toUser(row)
    this.setAuthCookie(event, user)
    return { user }
  }

  register = async (dto: RegisterRequest, event: H3Event): Promise<AuthResult> => {
    const hash = await bcrypt.hash(dto.password, 10)

    const row = await withTransaction(async (client) => {
      const taken = await queryOne<{ email: string, username: string }>(
        'SELECT email, username FROM users WHERE email = $1 OR username = $2 LIMIT 1',
        [dto.email, dto.username],
        client
      )
      if (taken) {
        throw createError({
          statusCode: 400,
          statusMessage: taken.email === dto.email ? 'Email đã tồn tại' : 'Username đã tồn tại'
        })
      }

      const created = await queryOne<UserRow>(
        `INSERT INTO users (username, email, password_hash, fullname)
         VALUES ($1, $2, $3, $4)
         RETURNING ${USER_PUBLIC_COLUMNS}`,
        [dto.username, dto.email, hash, dto.fullname],
        client
      )
      // Ví khởi tạo cùng transaction: lỗi tạo ví ⇒ không có user mồ côi.
      await execute(
        'INSERT INTO wallets (user_id, cash_balance, total_value) VALUES ($1, $2, $2)',
        [created!.id, INITIAL_WALLET_BALANCE],
        client
      )
      return created!
    })

    const user = toUser(row)
    this.setAuthCookie(event, user)
    return { user }
  }

  me = async (userId: number): Promise<User> => userService.getById(userId)

  logout = (event: H3Event): { ok: true } => {
    setCookie(event, 'auth_token', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    })
    return { ok: true }
  }

  /** Đặt chat đang xem cho user — chỉ nhận chat thuộc chính user (hoặc null để xoá). */
  setLastActiveChat = async (userId: number, chatId: string | null): Promise<void> => {
    if (chatId) {
      const owned = isUuid(chatId) && await queryOne('SELECT 1 FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId])
      if (!owned) {
        throw createError({ statusCode: 404, statusMessage: 'Chat không tồn tại hoặc không thuộc user' })
      }
    }
    await execute('UPDATE users SET last_active_chat_id = $1 WHERE id = $2', [chatId, userId])
  }

  private setAuthCookie = (event: H3Event, user: User): void => {
    const token = signAuthToken({ id: user.id, email: user.email })
    setCookie(event, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: TOKEN_TTL_SECONDS,
      path: '/'
    })
  }
}

export const authService = new AuthService()
