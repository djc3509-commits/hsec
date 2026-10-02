// IMPORT
import type { ChatModel } from '../../../server/dtos/chat'

// TYPE
interface ModelOption {
  label: string // Tên hiển thị trên UI
  value: ChatModel // Giá trị gửi lên API
  description: string // Mô tả ngắn
}
// EXPORT
export function useModels() {
  // Danh sách model Groq có thể chọn
  const models: ModelOption[] = [
    {
      label: 'Llama 3.3 70B',
      value: 'llama-3.3-70b-versatile',
      description: 'Mạnh nhất, phù hợp phân tích sâu'
    },
    {
      label: 'Llama 3.1 8B',
      value: 'llama-3.1-8b-instant',
      description: 'Nhẹ, phản hồi nhanh hơn'
    },
    {
      label: 'Llama 4 Scout',
      value: 'meta-llama/llama-4-scout-17b-16e-instruct',
      description: 'Mới nhất, context lớn'
    }
  ]

  // Model đang chọn — dùng useState để CHIA SẺ giữa ô chọn model và trang chat
  const model = useState<ChatModel>('chat-model', () => 'llama-3.3-70b-versatile')

  return { models, model }
}
