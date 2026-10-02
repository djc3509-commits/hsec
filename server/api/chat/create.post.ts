// Tạo 1 chat rỗng cho flow `Chat` class (trang chat đầy đủ). Trả về { id }.
import { chatService } from '../../service/chats/chat.service'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId as number
  return await chatService.createChat({ userId })
})
