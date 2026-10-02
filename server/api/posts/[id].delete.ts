import { postService } from '../../service/posts/post.service'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId as number
  const postId = parseInt(event.context.params?.id ?? '0')

  if (!postId) throw createError({ statusCode: 400, statusMessage: 'Thiếu postId' })

  await postService.deletePost(postId, userId)

  return { success: true }
})
