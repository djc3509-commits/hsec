// NGUỒN SỰ THẬT cho chat session — dùng chung panel ↔ full page.
//
// CÁCH 3 (DB-backed):
//   - Đọc `lastActiveChatId` từ auth user state (do /api/auth/me trả).
//   - Mỗi lần đổi chat → PATCH /api/chat/active để server lưu.
//   - Không dùng cookie nữa → switch user là tự nhiên (mỗi user 1 con trỏ riêng trong DB).
//
// SELF-HEAL: nếu thao tác trên chat trả 404 (cookie cũ trỏ tới chat người khác đã có
// bị xóa, hoặc tài khoản đổi giữa chừng) — gọi clearOnNotFound() để reset.
import type { User } from '../../../server/dtos/auth'

export function useChatSession() {
  const user = useState<User | null>('auth:user', () => null)

  // activeId lấy từ user.lastActiveChatId; sync ngược về server khi đổi.
  const activeId = useState<string | null>('chat-active-id', () => user.value?.lastActiveChatId ?? null)
  const pending = useState<{ id: string, text: string } | null>('chat-pending', () => null)

  // Khi user state đổi (login / logout / switch account):
  //   - User khác → coi như reset toàn bộ phiên chat (clear pending tránh leak)
  //   - Đồng bộ activeId từ user.lastActiveChatId mới (null nếu chưa có)
  watch(user, (newUser, oldUser) => {
    const switchedUser = newUser?.id !== oldUser?.id
    if (switchedUser) {
      pending.value = null
    }
    activeId.value = newUser?.lastActiveChatId ?? null
  })

  // Sync activeId → server (fire-and-forget, không block UI)
  async function syncToServer(chatId: string | null) {
    if (!user.value) return // chưa login → không sync
    try {
      await $fetch('/api/chat/active', { method: 'PATCH', body: { chatId } })
      // Cập nhật user state để các tab khác (cùng phiên) thấy luôn
      if (user.value) user.value.lastActiveChatId = chatId
    } catch {
      // Im lặng — server fail không phá UX. Lần load lại sẽ tự sync lại.
    }
  }

  // Tạo chat mới (rỗng) → set active + lưu tin đầu để gửi sau khi khung chat mount.
  async function createChat(firstText?: string): Promise<string> {
    const { id } = await $fetch<{ id: string }>('/api/chat/create', { method: 'POST' })
    if (firstText) pending.value = { id, text: firstText }
    activeId.value = id
    syncToServer(id)
    return id
  }

  // Trỏ tới 1 chat đang có (vd full page set theo route.params.id).
  function open(id: string | null) {
    activeId.value = id
    syncToServer(id)
  }

  // Bắt đầu lại từ đầu (nút "Chat mới").
  function newChat() {
    activeId.value = null
    pending.value = null
    syncToServer(null)
  }

  // Tự healing khi gặp 404 / 403 — chat không tồn tại hoặc không thuộc user.
  function clearOnNotFound() {
    activeId.value = null
    pending.value = null
    syncToServer(null)
  }

  // Lấy + xoá tin nhắn đầu đang chờ của đúng chat id (chỉ gửi 1 lần).
  function takePending(id: string): string | null {
    if (pending.value?.id === id) {
      const t = pending.value.text
      pending.value = null
      return t
    }
    return null
  }

  return { activeId, pending, createChat, open, newChat, clearOnNotFound, takePending }
}
