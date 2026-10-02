/**
 * Wrapper cho migrate — nạp `.env` trước khi gọi node-pg-migrate.
 *
 * Vì sao cần: node-pg-migrate v7 (deps chỉ `glob`+`yargs`) **KHÔNG tự đọc `.env`** — nó chỉ đọc
 * `process.env.DATABASE_URL`. Nuxt nạp `.env` native nên `npm run dev` chạy; nhưng `npm run migrate:up`
 * gọi thẳng CLI → trong shell KHÔNG có dotenvx (vd PowerShell máy dev) thì `DATABASE_URL` rỗng →
 * node-pg-migrate cố nối `localhost` → LỖI. Wrapper này nạp `.env` rồi uỷ quyền toàn bộ tham số cho
 * CLI thật, nên `migrate:up/down/create` chạy nhất quán trong MỌI shell.
 *
 * 🔴 Dùng `process.loadEnvFile` (Node ≥20.12, có sẵn trong runtime) chứ KHÔNG `import 'dotenv/config'`:
 * `dotenv` không được khai trong `package.json`, mà pnpm chỉ link đúng dependency đã khai ⇒ trên máy
 * cài bằng pnpm thì `npm run migrate:up` chết ngay ở dòng import với `ERR_MODULE_NOT_FOUND`, migration
 * không chạy nổi lệnh nào. Hàm sẵn có của Node vừa bỏ được phụ thuộc không khai, vừa giữ đúng ngữ nghĩa
 * cũ: **KHÔNG ghi đè** biến đã có trong env, nên shell đã set (dotenvx global) thì giá trị đó thắng.
 *
 * Không có `.env` (CI truyền biến qua môi trường) ⇒ bỏ qua, không phải lỗi.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const ENV_FILE = '.env'
if (existsSync(ENV_FILE)) {
  try {
    process.loadEnvFile(ENV_FILE)
  } catch (err) {
    console.error(`[migrate] không đọc được ${ENV_FILE}:`, err.message)
    process.exit(1)
  }
}

const require = createRequire(import.meta.url)
const pkgDir = dirname(require.resolve('node-pg-migrate/package.json'))
const bin = join(pkgDir, 'bin', 'node-pg-migrate.js')

if (!process.env.DATABASE_URL) {
  // Không có khoá kết nối thì node-pg-migrate lặng lẽ quay sang `localhost` rồi treo/timeout — báo
  // thẳng ở đây, đỡ một vòng đoán mò.
  console.error('[migrate] thiếu DATABASE_URL (không có trong env lẫn .env) — không chạy migration.')
  process.exit(1)
}

const child = spawn(process.execPath, [bin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env
})
child.on('error', (err) => {
  console.error('[migrate] không khởi chạy được node-pg-migrate:', err.message)
  process.exit(1)
})
child.on('exit', code => process.exit(code ?? 1))
