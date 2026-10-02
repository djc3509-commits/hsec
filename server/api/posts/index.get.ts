import { postService } from '../../service/posts/post.service'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId as number
  const tag = getQuery(event).tag as string | undefined
  return postService.getFeed(userId, tag)
})
