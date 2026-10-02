import { postService } from '../../service/posts/post.service'

export default defineEventHandler(async () => {
  return postService.getTrendingTags()
})
