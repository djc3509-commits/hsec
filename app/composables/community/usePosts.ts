import type { PostFeedItem, TrendingTag } from '../../../server/dtos/posts'

export function usePosts() {
  const posts = useState<PostFeedItem[]>('community-posts', () => [])
  const trending = useState<TrendingTag[]>('community-trending', () => [])
  const activeTag = useState<string>('community-tag', () => 'ALL')
  const loading = useState<boolean>('community-loading', () => false)
  const isPosting = ref(false)

  /** Fetch feed theo tag */
  async function fetchPosts(tag?: string) {
    const t = tag ?? activeTag.value
    loading.value = true
    try {
      posts.value = await $fetch<PostFeedItem[]>('/api/posts', {
        query: t !== 'ALL' ? { tag: t } : {}
      })
    } finally { loading.value = false }
  }

  /** Fetch trending tags cho sidebar */
  async function fetchTrending() {
    try {
      trending.value = await $fetch<TrendingTag[]>('/api/posts/trending')
    } catch {
      // Trending chỉ là phụ trợ sidebar → lỗi thì giữ danh sách cũ, không chặn trang
    }
  }

  /** Đổi tag đang filter */
  async function switchTag(tag: string) {
    activeTag.value = tag
    await fetchPosts(tag)
  }

  /** Đăng bài — server tự extract tag */
  async function createPost(content: string, sentiment: string, file?: File | null) {
    if (!content.trim() || !sentiment) return false
    isPosting.value = true
    try {
      const fd = new FormData()
      fd.append('content', content)
      fd.append('sentiment', sentiment)
      if (file) fd.append('image', file)
      await $fetch('/api/posts', { method: 'POST', body: fd })
      await Promise.all([fetchPosts(), fetchTrending()]) // refresh cả 2
      return true
    } catch {
      return false
    } finally {
      isPosting.value = false
    }
  }

  /** Toggle like — optimistic update */
  async function toggleLike(post: PostFeedItem) {
    const wasLiked = post.isLikedByMe
    const prevCount = post.likes
    post.isLikedByMe = !wasLiked
    post.likes = wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1
    try {
      const res = await $fetch<{ isLikedNow: boolean, likes: number }>('/api/posts/like', {
        method: 'POST', body: { postId: post.id }
      })
      post.isLikedByMe = res.isLikedNow
      post.likes = res.likes
    } catch {
      post.isLikedByMe = wasLiked
      post.likes = prevCount
    }
  }

  /** Xóa bài */
  async function deletePost(postId: number) {
    await $fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    posts.value = posts.value.filter(p => p.id !== postId)
  }

  return {
    posts, trending, activeTag, loading, isPosting,
    fetchPosts, fetchTrending, switchTag, createPost, toggleLike, deletePost
  }
}
