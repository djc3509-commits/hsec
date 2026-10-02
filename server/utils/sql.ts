// Tiện ích dựng mệnh đề SQL dùng chung (PostgreSQL, tham số $n).

/**
 * Lọc theo khoảng ngày 'YYYY-MM-DD' (gồm trọn ngày `to`).
 * `startIndex` = số thứ tự $n đầu tiên còn trống trong câu SQL của nơi gọi.
 */
export function dateRangeWhere(
  opts: { from?: string, to?: string },
  column = 'created_at',
  startIndex = 1
): { where: string, params: string[] } {
  const parts: string[] = []
  const params: string[] = []
  let i = startIndex
  if (opts.from) {
    parts.push(`${column} >= $${i++}::date`)
    params.push(opts.from)
  }
  if (opts.to) {
    parts.push(`${column} < $${i}::date + 1`)
    params.push(opts.to)
  }
  return { where: parts.join(' AND '), params }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Cột uuid của PostgreSQL ném lỗi khi nhận chuỗi sai định dạng → kiểm trước để trả 404 thay vì 500. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
