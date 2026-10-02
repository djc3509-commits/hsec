// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

/**
 * ChatRole - Vai trò trong cuộc hội thoại
 * @type {string} user      - Người dùng gửi tin
 * @type {string} assistant - AI trả lời
 */

export type ChatRole = 'user' | 'assistant'

/**
 * Danh sách model Groq HỢP LỆ — nguồn duy nhất dùng cho cả validate (server) lẫn type.
 * Thêm/bớt model chỉ sửa ở đây. (Đã bỏ mixtral-8x7b-32768 vì Groq đã khai tử.)
 */
// llama-3.3-70b-versatile = mạnh nhất | llama-3.1-8b-instant = nhanh | llama-4-scout = mới, context lớn
export const CHAT_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'meta-llama/llama-4-scout-17b-16e-instruct'
] as const

export type ChatModel = typeof CHAT_MODELS[number]

/** Model mặc định khi client không gửi hoặc gửi model không hợp lệ. */
export const DEFAULT_CHAT_MODEL: ChatModel = 'llama-3.3-70b-versatile'

/** Validate 1 giá trị có nằm trong danh sách model hợp lệ không. */
export function isValidChatModel(value: unknown): value is ChatModel {
  return typeof value === 'string' && (CHAT_MODELS as readonly string[]).includes(value)
}

// ─────────────────────────────────────────────────────────────
// REQUEST DTOs  (client → server)
// ─────────────────────────────────────────────────────────────

/**
 * SendMessageDto - Body gửi lên khi chat
 * @property {string | null}      chatId           - ID session hiện tại, null nếu là chat mới
 * @property {array}              messages          - Toàn bộ lịch sử tin nhắn gửi lên (role + content)
 * @property {ChatModel}          model             - Model AI muốn dùng, mặc định llama-3.3-70b-versatile
 */

export interface SendMessageDto {
  chatId: string | null
  messages: { role: ChatRole, content: string }[]
  model?: ChatModel
}

/**
 * RenameChatDto - Body gửi lên khi đổi tên session
 * @property {string} title - Tên mới của cuộc hội thoại
 */

export interface RenameChatDto {
  title: string
}

// ─────────────────────────────────────────────────────────────
// RESPONSE DTOs  (server → client)
// ─────────────────────────────────────────────────────────────

/**
 * ChatSessionResponse - 1 session trả về từ bảng `chats` (MySQL)
 * @property {string}        id         - UUID của session (varchar 36)
 * @property {string | null} title      - Tiêu đề session, null nếu chưa generate
 * @property {string}        created_at - Thời gian tạo session1
 */

export interface ChatSessionResponse {
  id: string
  title: string | null
  created_at: string
}

/**
 * MessageResponse - 1 tin nhắn trả về từ bảng `chat_messages` (MySQL)
 * @property {string}        id         - UUID của tin nhắn (varchar 36)
 * @property {string}        chat_id    - ID session của tin nhắn (varchar 36)
 * @property {ChatRole}      role       - Vai trò của tin nhắn (user/assistant)
 * @property {string}        content     - Nội dung tin nhắn
 * @property {string}        created_at - Thời gian tạo tin nhắn
 */

export interface ChatMessageResponse {
  id: string
  chat_id: string
  role: ChatRole
  content: string
  created_at: string
}

/**
 * ChatHistoryResponse - Danh sách sessions trả về
 * @property {ChatSessionResponse[]} chats - Mảng các session của user
 */

export interface ChatHistoryResponse {
  chats: ChatSessionResponse[]
}

/**
 * ChatDetailResponse - Response khi GET history?chatId=... (dùng trong [id].vue)
 * @property {string}                id        - UUID của session
 * @property {string | null}          title    - Tiêu đề session
 * @property {boolean}                isOwner  - Luôn true (đã verify ownership)
 * @property {ChatMessageResponse[]}  messages - Mảng tin nhắn
 */
export interface ChatDetailResponse {
  id: string
  title: string | null
  isOwner: boolean
  messages: ChatMessageResponse[]
}

/**
 * ChatMessagesResponse - Danh sách tin nhắn của 1 session
 * @property {ChatMessageResponse[]} messages - Mảng tin nhắn theo thứ tự thời gian
 */

export interface ChatMessagesResponse {
  messages: ChatMessageResponse[]
}

// ─────────────────────────────────────────────────────────────
// UI TYPES  (dùng trong composables + components)
// ─────────────────────────────────────────────────────────────

/**
 * UIMmessage - Tin nhắn hiển thị trên giao diện chat
 * @property {string}   id          - UUID dùng làm key cho v-for
 * @property {ChatRole} role        - user hoặc assistant
 * @property {string}   content     - Nội dung hiển thị
 * @property {boolean}  isStreaming - Có đang trong quá trình streaming hay không (dùng để show loading animation)
 */

export interface UIMessage {
  id: string
  role: ChatRole
  content: string
  isStreaming?: boolean
}

/**
 * UISession - 1 session hiển thị trong sidebar
 * @property {string} id        - UUID của session
 * @property {string} label     - Tiêu đề hiển thị (fallback 'Untitled')
 * @property {string} to        - Route dẫn tới: /app/chat/:id
 * @property {string} createdAt - Thời gian tạo dùng để group theo ngày
 */

export interface UISession {
  id: string
  label: string
  to: string
  createdAt: string
}

/**
 * UISessionGroup - Nhóm sessions theo ngày trong sidebar
 * @property {string}      label - Tên nhóm: Today / Yesterday / This week / Older
 * @property {UISession[]} items - Danh sách sessions trong nhóm
 */

export interface UISessionGroup {
  label: string
  items: UISession[]
}
