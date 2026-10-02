// ─────────────────────────────────────────────────────────────
// NEWS SERVICE — Tin tức (chỉ đọc; bài được đăng từ trang quản trị).
// ─────────────────────────────────────────────────────────────
import { createError } from 'h3'
import DOMPurify from 'isomorphic-dompurify'
import { query, queryOne } from '../../utils/db'

export const NEWS_CATEGORIES = ['macro', 'bitcoin', 'altcoin', 'defi', 'nft', 'regulation'] as const
const PAGE_SIZE = 10
const LIST_COLUMNS = 'id, title, summary, image, source, source_url, category, views, likes, is_featured, published_at'

interface NewsRow {
  id: number
  title: string
  summary: string | null
  image: string | null
  source: string | null
  source_url: string | null
  category: string
  views: number
  likes: number
  is_featured: boolean
  published_at: Date
  content?: string | null
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 60) return `${Math.max(0, mins)} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  if (days < 30) return `${days} ngày trước`
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function format(r: NewsRow) {
  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    image: r.image,
    source: r.source,
    sourceUrl: r.source_url,
    category: r.category,
    views: r.views,
    likes: r.likes,
    isFeatured: r.is_featured,
    publishedAt: r.published_at,
    timeAgo: timeAgo(new Date(r.published_at)),
    // Trang chi tiết render bằng v-html → lọc HTML tại server để script/thuộc tính nguy hiểm không tới trình duyệt.
    ...(r.content !== undefined ? { content: r.content ? DOMPurify.sanitize(r.content) : r.content } : {})
  }
}

export class NewsService {
  /** 2 bài nổi bật + 1 trang danh sách (lọc theo danh mục nếu hợp lệ). */
  list = async (category: string, page: number) => {
    const offset = (page - 1) * PAGE_SIZE
    const byCategory = (NEWS_CATEGORIES as readonly string[]).includes(category)
    const where = `WHERE status = 'published'${byCategory ? ' AND category = $1' : ''}`
    const catParams = byCategory ? [category] : []

    const [hero, list, count] = await Promise.all([
      query<NewsRow>(`SELECT ${LIST_COLUMNS} FROM news WHERE status = 'published' AND is_featured ORDER BY published_at DESC LIMIT 2`),
      query<NewsRow>(
        `SELECT ${LIST_COLUMNS} FROM news ${where}
          ORDER BY published_at DESC
          LIMIT $${catParams.length + 1} OFFSET $${catParams.length + 2}`,
        [...catParams, PAGE_SIZE, offset]
      ),
      queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM news ${where}`, catParams)
    ])

    const total = count?.total ?? 0
    return {
      hero: hero.map(format),
      list: list.map(format),
      pagination: { page, limit: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) }
    }
  }

  /** Chi tiết 1 bài + tăng lượt xem. */
  getById = async (id: number) => {
    const row = await queryOne<NewsRow>(
      `UPDATE news SET views = views + 1
        WHERE id = $1 AND status = 'published'
        RETURNING ${LIST_COLUMNS}, content`,
      [id]
    )
    if (!row) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy bài viết' })
    return format(row)
  }

  /** Số bài mới đăng trong 24 giờ qua. */
  countRecent = async (): Promise<number> => {
    const row = await queryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM news WHERE status = 'published' AND published_at >= now() - interval '24 hours'`
    )
    return row?.count ?? 0
  }
}

export const newsService = new NewsService()
