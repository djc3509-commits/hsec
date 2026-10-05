/**
 * Cho phép tin tức ở trạng thái `archived` (lưu trữ / xoá mềm) — dùng bởi HSEC Admin.
 * App người dùng chỉ đọc bài `published` nên bài lưu trữ tự biến mất khỏi trang tin, nhưng vẫn khôi phục được.
 * Ràng buộc CHECK đặt inline ở migration khởi tạo ⇒ Postgres đặt tên mặc định `news_status_check`.
 */

/** @type {import('node-pg-migrate').ColumnDefinitions | undefined} */
export const shorthands = undefined

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE news DROP CONSTRAINT IF EXISTS news_status_check;
    ALTER TABLE news ADD CONSTRAINT news_status_check CHECK (status IN ('draft', 'published', 'archived'));
  `)
}

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const down = (pgm) => {
  // Bài đang lưu trữ phải về nháp trước, nếu không ràng buộc cũ sẽ không thêm lại được.
  pgm.sql(`
    UPDATE news SET status = 'draft' WHERE status = 'archived';
    ALTER TABLE news DROP CONSTRAINT IF EXISTS news_status_check;
    ALTER TABLE news ADD CONSTRAINT news_status_check CHECK (status IN ('draft', 'published'));
  `)
}
