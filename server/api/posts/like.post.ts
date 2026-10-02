import { postService } from '../../service/posts/post.service'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId as number
  const { postId } = await readBody(event)
  if (!postId) throw createError({ statusCode: 400, statusMessage: 'Thiếu postId' })

  return postService.toggleLike(postId, userId)
})
