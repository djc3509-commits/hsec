// ─────────────────────────────────────────────────────────────
// NEWS DTO — Chỉ phục vụ READ-ONLY (lấy bài viết từ DB).
// ─────────────────────────────────────────────────────────────
export type NewsCategory = 'macro' | 'bitcoin' | 'altcoin' | 'defi' | 'nft' | 'regulation'

export interface News {
  id: number
  title: string
  summary: string | null
  image: string | null
  content: string | null
  source: string
  sourceUrl: string | null
  category: NewsCategory
  views: number
  likes: number
  isFeatured: boolean
  publishedAt: string
  timeAgo: string
}
