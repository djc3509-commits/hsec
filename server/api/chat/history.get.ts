// DTO - Types
import type { ChatDetailResponse, ChatHistoryResponse } from '../../dtos/chat'
// Service - ChatService
import { chatService } from '../../service/chats/chat.service'

export default defineEventHandler(async (event) => {
  // LẤY USER ID TỪ CONTEXT (middleware auth đã xử lý)
  const userId = event.context.userId as number

  // LẤY QUERY PARAM
  const query = getQuery(event)
  const chatId = query.chatId as string | undefined

  // ── Có chatId → lấy messages của session đó ───────────────
  if (chatId) {
    const data: ChatDetailResponse = await chatService.getMessages({ chatId, userId })
    return data
  }

  // ── Không có chatId → lấy danh sách sessions ──────────────
  const data: ChatHistoryResponse = await chatService.getSessions({ userId })
  return data
})
