# HSEC

Sàn giao dịch crypto **giả lập** (paper trading) kèm trợ lý AI — nơi người mới tập đặt lệnh, quản lý ví và đọc phân tích thị trường bằng **tiền ảo**, với **giá thật** lấy từ Binance.

> Dự án học tập fullstack Nuxt 4 + PostgreSQL + AI. Mọi số dư, coin và giao dịch trong HSEC đều là tiền ảo, không có giá trị thực.

## Chạy lần đầu

Yêu cầu: Node.js 22+, **pnpm**, một database **PostgreSQL** trống (14+).

```bash
pnpm install
cp .env.example .env      # điền DATABASE_URL, JWT_SECRET, các key Groq / Cloudinary
pnpm migrate:up           # tạo toàn bộ bảng + phí giao dịch mặc định
pnpm dev                  # http://localhost:3000
```

Khi server khởi động với database trống, nó **tự nạp danh mục ~100 coin** (CoinGecko + Binance) rồi đồng bộ giá mỗi 30 giây — không cần chạy script seed riêng. Người dùng mới đăng ký được tặng **10.000 USDT ảo**.

## Tính năng

| Mảng | Trang | Nội dung |
|---|---|---|
| Giao dịch | `/orders` | Lệnh MARKET / LIMIT, sổ lệnh, khớp lệnh nội bộ, phí maker/taker cấu hình được, lịch sử lệnh |
| Ví | `/wallets` | Nạp tiền ảo, số dư USDT, coin đang giữ, biểu đồ tài sản, lịch sử giao dịch |
| AI Analyst | `/analyst` | Chỉ báo kỹ thuật (EMA, RSI, MACD, Bollinger) + chấm tin tức → hướng giá và kế hoạch vào lệnh (entry / SL / TP). AI chỉ viết phần diễn giải, **không tính số**. Lưu lịch sử, tự đóng khuyến nghị khi chạm TP/SL |
| Chat AI | `/chat` | Trò chuyện với AI (stream), lưu lịch sử hội thoại |
| Thị trường | `/markets` | Bảng giá coin cập nhật từ Binance |
| Cộng đồng | `/community` | Đăng bài, ảnh, thích, tag nổi bật |
| Tin tức | `/news` | Tin thị trường (bài được đăng từ trang quản trị) |
| Tổng quan | `/home` | Thống kê lệnh, tâm lý thị trường, coin phổ biến |
| Cài đặt | `/settings` | Hồ sơ, ảnh đại diện, bảo mật, thông báo |

## Quy tắc tiền khi khớp lệnh

- Tiền và khối lượng lưu dạng `NUMERIC(30,8)` — không dùng số thực.
- Lệnh **BUY** giữ tiền lúc đặt (`số lượng × giá × (1 + phí cao nhất)`); khi khớp, phần chênh (khớp rẻ hơn giá đặt, phí maker thấp hơn) được **hoàn ngay về ví**; huỷ lệnh hoàn toàn bộ tiền còn giữ.
- Lệnh **SELL** khoá coin lúc đặt; người bán nhận tiền trừ phí **đúng vai** (maker hoặc taker).
- Lệnh vừa đặt là **taker**, lệnh có sẵn trong sổ là **maker**. Không khớp với lệnh của chính mình.
- Lệnh **MARKET** không nằm chờ trong sổ: phần chưa khớp được huỷ và hoàn lại.
- Đặt lệnh + khớp lệnh chạy trong **một transaction**: lỗi ở bất kỳ bước nào → không có gì bị ghi dở.

## Công nghệ

- **Nuxt 4** (Vue 3, Nitro) · **Nuxt UI 4** · `@nuxtjs/i18n` (Tiếng Việt mặc định, có English) · `@nuxtjs/color-mode`
- **PostgreSQL** qua `pg`, SQL viết tay (không ORM), migration bằng `node-pg-migrate`
- **Xác thực:** JWT trong cookie `auth_token` (httpOnly), mật khẩu băm `bcrypt`
- **AI:** Vercel AI SDK (`ai`) + Groq (Llama); `technicalindicators` cho chỉ báo kỹ thuật
- **Biểu đồ:** ApexCharts, Chart.js, Lightweight Charts
- **Ảnh:** Cloudinary (thư mục `hsec_community`, `hsec_avatars`)
- **Giá:** Binance public API; danh mục coin: CoinGecko

## Cấu trúc thư mục

```
app/                Giao diện (pages, components, composables, layouts, locales)
server/
  api/              Route HTTP — mỏng: đọc request → gọi service
  service/          Nghiệp vụ (orders, wallet, analyst, chats, coin, news, posts, user, auth…)
  dtos/             Kiểu dữ liệu request / response (dùng chung client + server)
  utils/            db (pool PostgreSQL), sql, auth (JWT), cloudinary, groq-analyst
  plugins/          Việc chạy nền: priceSync (nạp coin + đồng bộ giá), analystTracker (đóng khuyến nghị)
  middleware/       Chặn đăng nhập cho /api/chat và /api/posts
migrations/         Schema PostgreSQL (node-pg-migrate)
scripts/migrate.mjs Nạp .env rồi chạy node-pg-migrate
```

Luồng xử lý: `server/api` → `server/service` → `server/utils/db`.

## Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgres://user:pass@host:5432/hsec` — thêm `?sslmode=require` nếu database cần SSL |
| `JWT_SECRET` | ✅ | Chuỗi ngẫu nhiên ≥ 32 ký tự. Server từ chối chạy nếu để trống hoặc dùng giá trị mặc định công khai |
| `GROQ_API_KEY` | ✅ | Key Groq cho Chat AI |
| `GROQ_API_KEY_ANALYST` | ✅ | Key Groq **riêng** cho AI Analyst |
| `ANALYST_MODEL`, `ANALYST_MAX_TOKENS` | | Mô hình và giới hạn token cho Analyst |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | ✅ | Upload ảnh bài viết và ảnh đại diện |

> ⚠️ Không commit `.env`. `.env.example` chỉ chứa giá trị mẫu.

## Lệnh

| Lệnh | Việc |
|---|---|
| `pnpm dev` | Chạy dev server |
| `pnpm build` · `pnpm preview` | Build production · chạy thử bản build |
| `pnpm migrate:up` | Áp mọi migration chưa chạy |
| `pnpm migrate:down` | Lùi 1 migration |
| `pnpm migrate:create <ten>` | Tạo file migration mới |
| `pnpm lint` · `pnpm typecheck` | ESLint · TypeScript |

## Ghi chú

- Hai việc chạy nền dùng `setInterval` trong server — nếu chạy nhiều bản server cùng lúc, mỗi bản đều chạy lặp.
- Bài tin tức và cấu hình phí do **trang quản trị** ghi vào cùng database.
