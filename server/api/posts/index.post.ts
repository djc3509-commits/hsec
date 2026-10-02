import { postService } from '../../service/posts/post.service'
import type { CreatePostDto } from '../../dtos/posts'

const VALID_SENTIMENTS = ['bull', 'bear', 'neutral'] as const
type Sentiment = typeof VALID_SENTIMENTS[number]
const MAX_CONTENT_LENGTH = 2000
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB, cùng trần với ảnh đại diện

export default defineEventHandler(async (event) => {
  const userId = event.context.userId as number
  const multipartData = await readMultipartFormData(event)

  if (!multipartData) throw createError({ statusCode: 400, statusMessage: 'No data' })

  let content = '', sentiment = '', imageBuffer: Buffer | undefined

  for (const part of multipartData) {
    if (part.name === 'content') content = part.data.toString('utf-8')
    if (part.name === 'sentiment') sentiment = part.data.toString('utf-8')
    if (part.name === 'image' && part.filename) imageBuffer = part.data
  }

  if (!content.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Nội dung không được để trống' })
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `Nội dung tối đa ${MAX_CONTENT_LENGTH} ký tự` })
  }
  if (imageBuffer && imageBuffer.length > MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Ảnh tối đa 5MB' })
  }

  if (!VALID_SENTIMENTS.includes(sentiment as Sentiment)) {
    throw createError({ statusCode: 400, statusMessage: 'Sentiment không hợp lệ (bull | bear | neutral)' })
  }

  const dto: CreatePostDto = { content, sentiment: sentiment as Sentiment }

  return postService.createPostWithImage(userId, dto, imageBuffer)
})
