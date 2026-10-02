// plugins/order.client.ts
// Chạy 1 lần khi app khởi động (client-only). Đây là service nền theo dõi
export default defineNuxtPlugin(() => {
  // lệnh khớp cho TOÀN app — không phụ thuộc user đang ở trang nào.
  // Chạy ngầm, theo dõi lệnh khớp → gọi callback onOrderFilled() → update wallet.
  const { start } = useOrderNotifications(() => {
    useWallet().init()
  })
  start()
})
