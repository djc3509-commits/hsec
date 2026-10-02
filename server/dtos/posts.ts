// ── COIN META — chỉ dùng để hiện icon/màu trên sidebar ──
// Không dùng để filter cứng, trending tính từ DB thực tế
export const COIN_META: Record<string, { icon: string, color: string, bg: string }> = {
  BTC: { icon: '₿', color: 'amber', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ETH: { icon: 'Ξ', color: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  SOL: { icon: '◎', color: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  BNB: { icon: '●', color: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  XRP: { icon: '✕', color: 'cyan', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  ADA: { icon: '₳', color: 'teal', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  DOT: { icon: '●', color: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  DEFAULT: { icon: '#', color: 'neutral', bg: 'bg-gray-100 dark:bg-gray-800' }
}
// ── REQUEST DTOs ──────────────────────────────────────
export interface CreatePostDto {
  content: string
  sentiment: 'bull' | 'bear' | 'neutral'
}

export interface ToggleLikeDto {
  postId: number
}

// ── RESPONSE DTOs ─────────────────────────────────────
export interface PostFeedItem {
  id: number
  userId: number
  user: string
  avatar: string
  isExpert: boolean
  sentiment: 'bull' | 'bear' | 'neutral'
  content: string
  tags: string[] // ['BTC', 'ETH', ...]
  likes: number
  comments: number
  image: string | null
  time: string
  isLikedByMe: boolean
}

export interface ToggleLikeResponse {
  isLikedNow: boolean
  likes: number
}

// Trending tag — tính từ DB thực tế
export interface TrendingTag {
  symbol: string // 'BTC'
  post_count: number // số bài có tag này
}
