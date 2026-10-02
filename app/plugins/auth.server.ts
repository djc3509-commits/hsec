// Hydrate auth state khi app khởi động.
// Chạy cả SSR + client: server forward cookie auth_token tự động → /api/auth/me OK.
export default defineNuxtPlugin(async () => {
  const { refresh } = useAuth()
  await refresh()
})
