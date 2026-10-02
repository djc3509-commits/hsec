// composables/auth/useAuth.ts
// Composable quản lý auth state. Reactive, SSR-safe, share state qua useState.
// - user: User | null
// - isLoggedIn: boolean
// - refresh(): hydrate từ /api/auth/me (plugin gọi lúc app start)
// - login/register/logout: gọi API + cập nhật state
import type {
  LoginRequest, RegisterRequest, User, AuthResult
} from '../../../server/dtos/auth'

export type { User, LoginRequest, RegisterRequest }

export function useAuth() {
  // useState đảm bảo state share giữa các component + SSR safe
  const user = useState<User | null>('auth:user', () => null)
  const isLoggedIn = computed(() => !!user.value)

  async function refresh(): Promise<void> {
    try {
      // SSR: $fetch nội bộ không tự forward cookie từ request gốc → phải truyền tay.
      // Client: browser tự gửi cookie, không cần override.
      const headers = import.meta.server
        ? useRequestHeaders(['cookie'])
        : undefined
      user.value = await $fetch<User>('/api/auth/me', { headers })
    } catch {
      user.value = null
    }
  }

  async function login(email: string, password: string): Promise<User> {
    const body: LoginRequest = { email, password }
    const res = await $fetch<AuthResult>('/api/auth/login', { method: 'POST', body })
    user.value = res.user
    return res.user
  }

  async function register(dto: RegisterRequest): Promise<User> {
    const res = await $fetch<AuthResult>('/api/auth/register', { method: 'POST', body: dto })
    user.value = res.user
    return res.user
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
    await navigateTo('/auth/login')
  }

  return { user, isLoggedIn, refresh, login, register, logout }
}
