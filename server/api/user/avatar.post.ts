// POST /api/user/avatar — upload avatar via multipart, lưu URL Cloudinary vào users.avatar.
import { userService } from '../../service/user/user.service'
import { requireUserId } from '../../utils/auth'

const MAX_BYTES = 5 * 1024 * 1024 // 5MB

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const multipart = await readMultipartFormData(event)

  if (!multipart || multipart.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Thiếu file ảnh' })
  }

  const file = multipart.find(p => p.name === 'avatar' && !!p.filename)
  if (!file) {
    throw createError({ statusCode: 400, statusMessage: 'Field "avatar" không tìm thấy' })
  }

  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Ảnh tối đa 5MB' })
  }

  // Cloudinary tự detect content-type qua buffer header, không cần check mimetype chặt
  return userService.uploadAvatar(userId, file.data)
})
