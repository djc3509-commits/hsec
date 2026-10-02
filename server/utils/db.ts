// Kết nối PostgreSQL — một pool dùng chung cho toàn server.
// Cấu hình bằng DUY NHẤT biến DATABASE_URL (vd postgres://user:pass@host:5432/hsec).
// Cần SSL (Neon, Supabase…) thì thêm `?sslmode=require` vào cuối DATABASE_URL.
import pg from 'pg'
import { createError } from 'h3'

// COUNT(*) / BIGINT trả về chuỗi theo mặc định → ép về number (mọi id/đếm của HSEC nằm trong 2^53).
// NUMERIC (tiền, khối lượng) GIỮ NGUYÊN chuỗi để không mất chính xác; service tự parse khi cần.
pg.types.setTypeParser(pg.types.builtins.INT8, value => Number(value))

let pool: pg.Pool | null = null

/** Pool kết nối, tạo lần đầu khi có truy vấn. Thiếu DATABASE_URL → lỗi rõ ràng thay vì treo ở localhost. */
export function getPool(): pg.Pool {
  if (pool) return pool
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw createError({ statusCode: 500, statusMessage: 'Chưa cấu hình DATABASE_URL trong .env' })
  }
  pool = new pg.Pool({ connectionString, max: 10 })
  pool.on('error', err => console.error('[db] lỗi kết nối nền:', err.message))
  return pool
}

export type DbClient = pg.PoolClient

/** Chạy 1 câu SQL, trả về các dòng. Tham số dùng $1, $2… */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client?: DbClient
): Promise<T[]> {
  const result = await (client ?? getPool()).query<T>(sql, params)
  return result.rows
}

/** Như `query` nhưng chỉ lấy dòng đầu (hoặc null). */
export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client?: DbClient
): Promise<T | null> {
  const rows = await query<T>(sql, params, client)
  return rows[0] ?? null
}

/** Chạy câu ghi, trả về số dòng bị ảnh hưởng. */
export async function execute(sql: string, params: unknown[] = [], client?: DbClient): Promise<number> {
  const result = await (client ?? getPool()).query(sql, params)
  return result.rowCount ?? 0
}

/** Gói nhiều câu vào MỘT transaction: lỗi ở bất kỳ đâu → ROLLBACK toàn bộ. */
export async function withTransaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
