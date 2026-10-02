// Endpoint stream cho `Chat` class của @ai-sdk/vue (giao thức UI message stream).
import type { UIMessage } from 'ai'
import { isValidChatModel, DEFAULT_CHAT_MODEL } from '../../dtos/chat'
import { chatService } from '../../service/chats/chat.service'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId as number
  const body = await readBody<{ id: string, messages: UIMessage[], model?: string }>(event)

  if (!body?.id) {
    throw createError({ statusCode: 400, statusMessage: 'Thiếu id chat' })
  }
  if (!body.messages?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Tin nhắn không được để trống' })
  }

  // Validate model: thiếu/không hợp lệ → fallback mặc định (tự lành nếu client còn cache model cũ đã chết)
  const model = isValidChatModel(body.model) ? body.model : DEFAULT_CHAT_MODEL

  const result = await chatService.streamMessage({
    userId,
    id: body.id,
    messages: body.messages,
    model
  })

  return result.toUIMessageStreamResponse()
})
