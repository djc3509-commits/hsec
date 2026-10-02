import type { RenameChatDto } from '../../../dtos/chat'
import { chatService } from '../../../service/chats/chat.service'

export default defineEventHandler(async (event) => {
  // LẤY USER ID TỪ CONTEXT (middleware auth đã xử lý)
  const userId = event.context.userId as number

  // LẤY CHAT ID TỪ ROUTE PARAM
  const chatId = getRouterParam(event, 'chatId') as string

  // LẤY TITLE MỚI TỪ BODY
  const { title } = await readBody<RenameChatDto>(event)
  if (!title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Title không được để trống' })
  }

  // GỌI SERVICE CẬP NHẬT TITLE
  return await chatService.renameSession({ chatId, userId, title })
})
