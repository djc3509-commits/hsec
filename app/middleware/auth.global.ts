// Global route middleware: chặn truy cập trang cần đăng nhập.
// Public routes (whitelist) không bị chặn.
const PUBLIC_ROUTES = ['/', '/auth/login', '/auth/register']

export default defineNuxtRouteMiddleware((to) => {
  if (PUBLIC_ROUTES.includes(to.path)) return

  const { isLoggedIn } = useAuth()
  if (!isLoggedIn.value) {
    return navigateTo('/auth/login')
  }
})
