// IMPORT
import { LazyChatModalRename, LazyChatModalConfirm } from '#components'

// EXPORT
export function useChatActions() {
  const route = useRoute()
  const toast = useToast()
  const overlay = useOverlay()

  // Khởi tạo modal 1 lần — dùng lại nhiều lần không tạo lại
  const renameModal = overlay.create(LazyChatModalRename)
  const deleteModal = overlay.create(LazyChatModalConfirm, {
    props: {
      title: 'Xóa cuộc trò chuyện',
      description: 'Bạn có chắc muốn xóa? Hành động này không thể hoàn tác.',
      color: 'error'
    }
  })

  /**
   * Đổi tên session
   * @param id           - UUID của session cần đổi tên
   * @param currentTitle - Tên hiện tại (prefill vào input)
   * @returns            - Tên mới nếu thành công, null nếu hủy/lỗi
   */
  async function renameChat(id: string, currentTitle?: string | null): Promise<string | null> {
    // Mở modal → chờ user nhập tên mới
    const instance = renameModal.open({ title: currentTitle ?? '' })
    const result = await instance.result

    // User hủy hoặc không đổi gì
    if (!result || result === currentTitle) return null

    try {
      await $fetch(`/api/chat/${id}/title`, {
        method: 'PATCH',
        body: { title: result }
      })

      // Cập nhật sidebar NGAY (refresh danh sách sessions, không cần reload trang)
      await refreshNuxtData('chat-sessions')

      // Nếu đang mở đúng chat vừa đổi tên → refresh cả tiêu đề navbar (chat detail của trang)
      if (route.params.id === id) {
        await refreshNuxtData(`chat-${id}`)
      }

      toast.add({
        title: 'Đã đổi tên',
        description: result,
        icon: 'i-lucide-pencil'
      })

      return result
    } catch {
      toast.add({
        description: 'Không thể đổi tên. Thử lại nhé!',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      return null
    }
  }

  /**
   * Xóa session
   * @param id - UUID của session cần xóa
   * @returns  - true nếu xóa thành công, false nếu hủy/lỗi
   */
  async function deleteChat(id: string): Promise<boolean> {
    // Mở modal confirm → chờ user xác nhận
    const instance = deleteModal.open()
    const result = await instance.result

    // User hủy
    if (!result) return false

    try {
      await $fetch(`/api/chat/${id}`, { method: 'DELETE' })

      // Cập nhật sidebar NGAY
      await refreshNuxtData('chat-sessions')

      toast.add({
        title: 'Đã xóa',
        description: 'Cuộc trò chuyện đã được xóa',
        icon: 'i-lucide-trash'
      })

      // Nếu đang xem đúng session bị xóa → về trang new chat
      if (route.params.id === id) {
        navigateTo('/chat')
      }

      return true
    } catch {
      toast.add({
        description: 'Không thể xóa. Thử lại nhé!',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      return false
    }
  }

  return { renameChat, deleteChat }
}
