# HSEC — Bối cảnh & kế hoạch Blockchain / Web3

> Tài liệu bàn giao cho AI/người khác tiếp quản. Tổng hợp toàn bộ trao đổi về HSEC, repo Solidity và hướng tự xây blockchain.
> Cập nhật: 2026-10-02. **Chưa có dòng code blockchain nào được viết** — đây mới là kế hoạch chờ chủ dự án chốt.

---

## 1. HSEC là gì (hiện trạng)

- Sàn giao dịch crypto **giả lập** (paper trading) + trợ lý AI. Tiền ảo, không có giá trị thực.
- Nguồn gốc: copy từ `D:\git\Zentara-Nuxt4` (MySQL/TiDB) → dự án mới `D:\git\HSEC`, chuyển sang **PostgreSQL**, sửa lỗi, dọn code rác. Chuẩn code tham chiếu: Lenful-Frontend-V8 và LenBox-Nuxt4.
- Stack: **Nuxt 4 + Nitro + Nuxt UI 4**, **PostgreSQL qua `pg`** (SQL viết tay, không ORM), migration `node-pg-migrate`, **pnpm**, JWT cookie `auth_token`, AI = Vercel AI SDK + Groq, ảnh = Cloudinary.
- Luồng: `server/api` (mỏng) → `server/service` (nghiệp vụ) → `server/utils/db` (`query`, `queryOne`, `execute`, `withTransaction`).
- Git: 1 commit `init HSEC…` trên nhánh chính, **chưa có remote, chưa push** (chỉ push khi chủ dự án ra lệnh).

### Tình trạng kỹ thuật

| Hạng mục | Trạng thái |
|---|---|
| `pnpm typecheck` | ✅ 0 lỗi |
| `pnpm build` | ✅ OK |
| SQL (110 câu) + migration | ✅ parse OK bằng libpg-query, không cột lạ — **nhưng chưa chạy trên DB thật** |
| `pnpm lint` | ⚠️ 35 lỗi ở 15 component tên kebab-case (hook của môi trường Lenful chặn đổi tên PascalCase) — chờ quyết |
| Database | ❌ **Chưa tạo.** Chưa có `.env`. Chủ dự án tự tạo DB sau |
| Nút "Delete account" | ⚠️ chưa làm gì |
| HSEC Admin (Zentara-Admin-Nuxt4) | ⏳ chưa chuyển sang schema PostgreSQL mới |
| Mật khẩu TiDB cũ | ⚠️ lộ trong `.env.example` + lịch sử git của Zentara gốc → phải đổi |

### Chạy khi đã có DB

```bash
pnpm install
cp .env.example .env      # DATABASE_URL, JWT_SECRET (≥32 ký tự), GROQ_*, CLOUDINARY_*
pnpm migrate:up           # tạo 17 bảng + phí mặc định
pnpm dev                  # server tự nạp ~100 coin (CoinGecko + Binance), sync giá 30s
```

### Schema hiện có (`migrations/1000000000000_init-schema.js`, 17 bảng)

`users`, `wallets`, `virtual_coins`, `wallet_holdings`, `trading_fee_config`, `orders`, `order_book`, `matches`, `trades`, `admin_fee_records`, `deposit_transactions`, `chats`, `chat_messages`, `posts`, `post_likes`, `news`, `ai_recommendations`. Tiền/khối lượng: `NUMERIC(30,8)`.

### Bộ khớp lệnh (đã có, giữ lại)

`server/service/orders/matching.service.ts` + `order.service.ts`:
- BUY giữ tiền `qty × price × (1 + max(maker, taker))`, khớp rẻ hơn → hoàn chênh ngay; SELL khoá coin.
- Lệnh mới = taker, lệnh trong sổ = maker; phí đúng vai; chặn tự khớp.
- MARKET không nằm sổ, phần dư huỷ + hoàn.
- Đặt + khớp + settle trong **một transaction**.

### Phụ thuộc bên ngoài hiện tại (thứ chủ dự án muốn bỏ)

- `server/plugins/priceSync.ts`: nạp danh mục coin (CoinGecko) + giá Binance mỗi 30s.
- `server/service/kline`: nến từ Binance.
- AI Analyst đọc nến/giá Binance.

---

## 2. Repo `D:\git\Solidity` (đã đọc, chỉ đọc)

- Hardhat 3 + viem, Solidity 0.8. Là bài **CryptoZombies** (game NFT), chủ dự án vừa học xong phần smart contract.
- Contracts kế thừa: `ZombieFactory → ZombieFeeding → ZombieHelper → ZombieAttack → ZombieOwnership → CryptoZombies`, kèm `Ownable`, `SafeMath`, `ERC721` tự viết.
- `scripts/deploy.ts`; `client/index.html` dùng web3.js kiểu cũ.
- Lỗi: `test/` và `ignition/` vẫn là mẫu `Counter` (contract không tồn tại); thư mục `bin/` bị commit.
- **Không dùng trực tiếp được trong chain tự viết** (chain tự viết không chạy EVM). Kiến thức token/NFT/ký giao dịch thì dùng được.

---

## 3. Diễn biến quyết định

1. Hỏi: đưa Solidity vào HSEC thay Binance API bằng "coin thật" được không?
   → Trả lời: Binance chỉ là **nguồn giá**; CryptoZombies là game NFT, không phải coin; sàn giữ tiền thật cần giấy phép + bảo mật. Đề xuất "Web3 Lab" trên testnet Sepolia (MetaMask + viem, token ERC-20 HSEC, NFT zombie dùng OpenZeppelin).
2. Chủ dự án bác: muốn **lõi riêng** — "bỏ cái gọi API, viết được coin, viết được blockchain, lấy nó về giao diện web, và giả lập người dùng giao dịch".
3. Hai hướng được đưa ra:
   - **A (khuyến nghị):** tự viết blockchain bằng TypeScript chạy cạnh server HSEC.
   - **B:** dùng chain EVM có sẵn (Hardhat node / Anvil / Geth-Besu PoA) + coin viết bằng Solidity — dùng lại được repo Solidity và MetaMask, nhưng **không tự viết blockchain**.
4. Chủ dự án hỏi 14 ngày có khả thi không (trình độ: vừa xong smart contract, đang học deploy/giao dịch lên mạng).
   → Bản đầy đủ: **không**. **MVP cắt phạm vi: khả thi** nếu AI viết code và chủ dự án hiểu từng phần (tự viết từ đầu: ~4–6 tuần). Kế hoạch: học bằng hướng B 3 ngày đầu, rồi làm hướng A.
5. **Chưa chốt** — đang chờ chủ dự án xác nhận hướng và cho biết 14 ngày là để nộp/bảo vệ hay tự học.

---

## 4. Kiến trúc mục tiêu (hướng A)

```
┌──────────────────────────────────────────────────────────┐
│ HSEC Web: Sàn · Ví · Explorer (khối/giao dịch) · AI      │
└──────────────▲───────────────────────────▲───────────────┘
               │ REST + WebSocket          │
┌──────────────┴───────────┐  ┌────────────┴────────────────┐
│ Sàn (đã có)              │  │ Bot giả lập người dùng      │
│ sổ lệnh + khớp lệnh      │◄─┤ trader ảo đặt lệnh          │
│ nạp/rút qua chain        │  │ → giá sinh từ cung cầu      │
└──────────────┬───────────┘  └─────────────────────────────┘
               │ giao dịch đã ký
┌──────────────┴───────────────────────────────────────────┐
│ HSEC Chain: khối · tx ký secp256k1 · số dư theo địa chỉ  │
│ coin gốc HSC + token HUSD · PoA 1 node · khối mỗi ~3s    │
└──────────────────────────────────────────────────────────┘
```

### 4 phần lõi

1. **Chain (TypeScript):**
   - Block: `height`, `prevHash`, `timestamp`, `txs[]`, `merkleRoot`, chữ ký node tạo khối.
   - Tx: `from`, `to`, `asset`, `amount`, `nonce`, `fee`, chữ ký secp256k1 (thư viện gợi ý `@noble/secp256k1`, `@noble/hashes`). Địa chỉ suy ra từ public key.
   - Mô hình tài khoản (account model), số dư theo từng asset; mempool; kiểm nonce chống gửi lặp.
   - Đồng thuận **PoA** (1 node được chỉ định) — không dùng PoW (vô nghĩa khi giả lập, tốn CPU).
   - Lưu khối + trạng thái vào PostgreSQL; hàm kiểm toàn vẹn chuỗi (sửa khối cũ ⇒ phát hiện).
2. **Coin:** HSC (coin gốc, trả phí), HUSD (stablecoin định giá), có thể thêm vài coin "dự án" với tổng cung + genesis allocation. **Không dùng tên BTC/ETH** (gây hiểu nhầm là giá thật).
3. **Sàn gắn chain:** giữ bộ khớp lệnh off-chain như sàn tập trung; nạp/rút giữa ví on-chain ↔ sàn là giao dịch trên chain; (tuỳ chọn) ghi kết quả đợt khớp lên chain để Explorer kiểm lại.
4. **Thị trường giả lập:** bot market maker (đặt 2 phía tạo thanh khoản), trend follower, bắt đáy, random, thỉnh thoảng "cá voi"; tuỳ chọn tin tức giả tác động tâm lý. **Giá + nến OHLC tính từ bảng `trades` nội bộ**, thay Binance. AI Analyst chuyển sang đọc nến HSEC.

### Ngoài phạm vi 14 ngày

Mạng P2P nhiều node · đào PoW thật · máy ảo / smart contract trên chain tự viết · tiền thật · audit bảo mật · mainnet.

---

## 5. Lộ trình 14 ngày (đề xuất, chưa duyệt)

| Ngày | Việc | Mục tiêu học |
|---|---|---|
| 1–3 | Hardhat node cục bộ, deploy ERC-20 (OpenZeppelin), gửi tx bằng viem, nối MetaMask, đọc block/tx/receipt | tx, nonce, gas, chữ ký trong thực tế |
| 4–7 | Chain mini: khoá/địa chỉ, tx ký, block, mempool, PoA producer, lưu PostgreSQL, test "sửa khối cũ bị phát hiện" | blockchain bên trong |
| 8–9 | HSC/HUSD, genesis, faucet, ví user (server giữ khoá, mã hoá), trang Explorer | tokenomics, ví |
| 10–11 | Nạp/rút chain ↔ sàn; nến từ lệnh khớp; gỡ Binance (`priceSync`, `kline`) | sàn tập trung ↔ chain |
| 12–13 | Bot thị trường, chỉnh tham số cho giá tự nhiên | thanh khoản, hình thành giá |
| 14 | Chạy toàn luồng, sửa lỗi, kịch bản demo, README | — |

Trễ thì cắt theo thứ tự: chuyển AI Analyst → tin tức giả → bớt số token.
Mỗi giai đoạn kèm 1 trang giải thích ngắn + test chứng minh — rủi ro lớn nhất là chủ dự án không hiểu code để bảo vệ/tự sửa.

## 6. Thứ tự học cho chủ dự án

1. Giao dịch Ethereum: cấu trúc tx, nonce, gas, ký, receipt, event/log (thực hành Hardhat + viem).
2. Mật mã cơ bản: SHA-256 / keccak256, cặp khoá secp256k1, ký & xác minh, cách tạo địa chỉ.
3. Cấu trúc blockchain: block, prevHash, Merkle root, state số dư, mempool.
4. Đồng thuận: PoW vs PoA; khái niệm fork, finality.
5. ERC-20 & tokenomics: tổng cung, phân phối, mint/burn.
6. Sàn: order book, AMM `x·y=k`, nến OHLC, market making.

---

## 7. Ràng buộc làm việc với chủ dự án

- Nêu kế hoạch → **chờ duyệt** rồi mới code; không tự làm tiếp sang bước sau.
- **Không tạo DB, không chạy lệnh vào DB** khi chưa được lệnh.
- **Không push** khi chưa có lệnh rõ ở đúng lượt đó.
- Không tự chạy dev server / browser preview — chủ dự án tự kiểm trên trình duyệt.
- Tài liệu + comment tiếng Việt; định danh code tiếng Anh; dùng pnpm (không npm).
- Không đụng `D:\git\odoo`.
