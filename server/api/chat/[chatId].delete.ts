import { chatService } from '../../service/chats/chat.service'

export default defineEventHandler(async (event) => {
  // LẤY USER ID TỪ CONTEXT (middleware auth đã xử lý)
  const userId = event.context.userId as number

  // LẤY CHAT ID TỪ ROUTE PARAM
  const chatId = getRouterParam(event, 'chatId') as string

  // GỌI SERVICE XÓA SESSION
  return await chatService.deleteSession({ chatId, userId })
})
