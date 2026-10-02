// ─────────────────────────────────────────────────────────────
// POST SERVICE — Feed cộng đồng, đăng bài, thích / bỏ thích, xoá bài.
// ─────────────────────────────────────────────────────────────
import { createError } from 'h3'
import { execute, query, queryOne, withTransaction } from '../../utils/db'
import { uploadToCloud } from '../../utils/cloudinary'
import type { PostFeedItem, CreatePostDto, ToggleLikeResponse, TrendingTag } from '../../dtos/posts'

interface PostFeedRow {
  id: number
  user_id: number
  user: string
  avatar: string
  is_expert: boolean
  sentiment: 'bull' | 'bear' | 'neutral'
  content: string
  tags: string[]
  likes: number
  comments: number
  image: string | null
  time: string
  is_liked_by_me: boolean
}

export class PostService {
  /** 50 bài mới nhất (lọc theo tag nếu có), kèm cờ "tôi đã thích chưa". */
  getFeed = async (userId: number, tag?: string): Promise<PostFeedItem[]> => {
    const hasTag = Boolean(tag && tag !== 'ALL')
    const rows = await query<PostFeedRow>(
      `SELECT po.id, po.user_id, u.fullname AS user, u.avatar, u.is_expert,
              po.sentiment, po.content, po.tags,
              po.likes_count AS likes, po.comments_count AS comments,
              po.image_url AS image, po.created_at AS time,
              (pl.user_id IS NOT NULL) AS is_liked_by_me
         FROM posts po
         JOIN users u ON u.id = po.user_id
         LEFT JOIN post_likes pl ON pl.post_id = po.id AND pl.user_id = $1
        ${hasTag ? 'WHERE po.tags @> $2::jsonb' : ''}
        ORDER BY po.created_at DESC
        LIMIT 50`,
      hasTag ? [userId, JSON.stringify([tag])] : [userId]
    )

    return rows.map((r): PostFeedItem => ({
      id: r.id,
      userId: r.user_id,
      user: r.user,
      avatar: r.avatar,
      isExpert: r.is_expert,
      sentiment: r.sentiment,
      content: r.content,
      tags: r.tags ?? [],
      likes: r.likes,
      comments: r.comments,
      image: r.image,
      time: r.time,
      isLikedByMe: r.is_liked_by_me
    }))
  }

  /** Top 20 tag được nhắc nhiều nhất trong 500 bài gần nhất. */
  getTrendingTags = async (): Promise<TrendingTag[]> => {
    return query<TrendingTag>(
      `SELECT tag AS symbol, COUNT(*) AS post_count
         FROM (SELECT tags FROM posts ORDER BY created_at DESC LIMIT 500) recent,
              jsonb_array_elements_text(recent.tags) AS tag
        WHERE btrim(tag) <> ''
        GROUP BY tag
        ORDER BY post_count DESC
        LIMIT 20`
    )
  }

  /** Đăng bài; server tự tách tag: $BTC (cashtag) + từ viết hoa 2–5 ký tự đứng riêng (SOL, ADA). */
  createPost = async (userId: number, dto: CreatePostDto, imageUrl?: string): Promise<{ id: number }> => {
    const cashtags = dto.content.match(/\$([A-Z]{2,10})/g)?.map(t => t.slice(1)) ?? []
    const upperWords = dto.content.match(/\b[A-Z]{2,5}\b/g) ?? []
    const tags = [...new Set([...cashtags, ...upperWords])]

    const row = await queryOne<{ id: number }>(
      `INSERT INTO posts (user_id, content, sentiment, tags, image_url)
       VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING id`,
      [userId, dto.content, dto.sentiment, JSON.stringify(tags), imageUrl ?? null]
    )
    return { id: row!.id }
  }

  /** Đăng bài kèm ảnh: upload Cloudinary trước, lấy URL rồi lưu bài. */
  createPostWithImage = async (userId: number, dto: CreatePostDto, imageBuffer?: Buffer): Promise<{ id: number }> => {
    let imageUrl: string | undefined
    if (imageBuffer) {
      try {
        imageUrl = await uploadToCloud(imageBuffer, 'hsec_community')
      } catch (error) {
        console.error('[post.createPostWithImage] Cloudinary error:', error)
        throw createError({ statusCode: 500, statusMessage: 'Không thể upload ảnh lên cloud' })
      }
    }
    return this.createPost(userId, dto, imageUrl)
  }

  /** Thích / bỏ thích trong MỘT transaction — bấm liên tục không làm lệch bộ đếm. */
  toggleLike = async (postId: number, userId: number): Promise<ToggleLikeResponse> => {
    return withTransaction(async (client) => {
      const post = await queryOne('SELECT 1 FROM posts WHERE id = $1 FOR UPDATE', [postId], client)
      if (!post) throw createError({ statusCode: 404, statusMessage: 'Bài viết không tồn tại' })

      const inserted = await execute(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [postId, userId],
        client
      )
      if (!inserted) {
        await execute('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId], client)
      }
      const row = await queryOne<{ likes_count: number }>(
        `UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1)
          WHERE id = $1 RETURNING likes_count`,
        [postId],
        client
      )
      return { isLikedNow: inserted > 0, likes: row!.likes_count }
    })
  }

  /** Xoá bài — chỉ chủ bài viết mới xoá được. */
  deletePost = async (postId: number, userId: number): Promise<void> => {
    const deleted = await execute('DELETE FROM posts WHERE id = $1 AND user_id = $2', [postId, userId])
    if (!deleted) {
      throw createError({ statusCode: 403, statusMessage: 'Không có quyền xóa bài viết này' })
    }
  }
}

export const postService = new PostService()
