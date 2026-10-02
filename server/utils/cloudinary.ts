import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

/**
 * uploadToCloud — Upload buffer ảnh lên Cloudinary, trả về URL https
 * Nitro auto-import file này, dùng được ở mọi service mà không cần import tay.
 * @param buffer - Dữ liệu ảnh thô từ multipart FormData
 * @param folder - Thư mục lưu trên Cloudinary (vd: 'hsec_community')
 * @returns      - Secure URL của ảnh sau khi upload thành công
 */
export const uploadToCloud = (buffer: Buffer, folder: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) resolve(result.secure_url)
        else reject(error)
      }
    )
    stream.end(buffer)
  })
}
