/**
 * Schema khởi tạo của HSEC (PostgreSQL).
 * Quy ước: tên bảng/cột snake_case; tiền + khối lượng = NUMERIC(30,8) (không dùng float);
 * thời gian = timestamptz (UTC); khoá ngoại có ON DELETE rõ ràng.
 */

/** @type {import('node-pg-migrate').ColumnDefinitions | undefined} */
export const shorthands = undefined

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE users (
      id                  serial PRIMARY KEY,
      username            varchar(50)  NOT NULL UNIQUE,
      email               varchar(255) NOT NULL UNIQUE,
      password_hash       varchar(255) NOT NULL,
      fullname            varchar(100) NOT NULL,
      avatar              text,
      role                varchar(10)  NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
      is_active           boolean      NOT NULL DEFAULT true,
      is_expert           boolean      NOT NULL DEFAULT false,
      last_active_chat_id uuid,
      created_at          timestamptz  NOT NULL DEFAULT now(),
      updated_at          timestamptz  NOT NULL DEFAULT now()
    );

    CREATE TABLE wallets (
      id           serial PRIMARY KEY,
      user_id      integer       NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      cash_balance numeric(30,8) NOT NULL DEFAULT 0 CHECK (cash_balance >= 0),
      total_value  numeric(30,8) NOT NULL DEFAULT 0,
      created_at   timestamptz   NOT NULL DEFAULT now(),
      updated_at   timestamptz   NOT NULL DEFAULT now()
    );

    CREATE TABLE virtual_coins (
      id                       serial PRIMARY KEY,
      symbol                   varchar(20)   NOT NULL UNIQUE,
      name                     varchar(100)  NOT NULL,
      icon                     text,
      current_price            numeric(30,8) NOT NULL DEFAULT 0,
      price_change_24h         numeric(30,8) NOT NULL DEFAULT 0,
      price_change_percent_24h numeric(12,4) NOT NULL DEFAULT 0,
      high_24h                 numeric(30,8) NOT NULL DEFAULT 0,
      low_24h                  numeric(30,8) NOT NULL DEFAULT 0,
      volume_24h               numeric(30,8) NOT NULL DEFAULT 0,
      quote_volume_24h         numeric(30,8) NOT NULL DEFAULT 0,
      market_cap               numeric(30,2) NOT NULL DEFAULT 0,
      coin_rank                integer,
      is_active                boolean       NOT NULL DEFAULT true,
      created_at               timestamptz   NOT NULL DEFAULT now(),
      updated_at               timestamptz   NOT NULL DEFAULT now()
    );

    CREATE TABLE wallet_holdings (
      id            serial PRIMARY KEY,
      wallet_id     integer       NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      coin_id       integer       NOT NULL REFERENCES virtual_coins(id),
      amount        numeric(30,8) NOT NULL DEFAULT 0 CHECK (amount >= 0),
      avg_buy_price numeric(30,8) NOT NULL DEFAULT 0,
      created_at    timestamptz   NOT NULL DEFAULT now(),
      updated_at    timestamptz   NOT NULL DEFAULT now(),
      UNIQUE (wallet_id, coin_id)
    );

    CREATE TABLE trading_fee_config (
      id             serial PRIMARY KEY,
      fee_type       varchar(5)    NOT NULL CHECK (fee_type IN ('MAKER', 'TAKER')),
      fee_rate       numeric(10,6) NOT NULL CHECK (fee_rate >= 0 AND fee_rate < 1),
      symbol_pattern varchar(20)   NOT NULL DEFAULT '*',
      enabled        boolean       NOT NULL DEFAULT true,
      updated_at     timestamptz   NOT NULL DEFAULT now(),
      UNIQUE (fee_type, symbol_pattern)
    );

    -- reserved_cash: tiền còn đang giữ cho phần CHƯA khớp của lệnh BUY (hoàn lại khi khớp rẻ hơn / huỷ).
    -- reserve_fee_rate: tỷ lệ phí đã dùng để giữ tiền lúc đặt lệnh.
    CREATE TABLE orders (
      id                serial PRIMARY KEY,
      user_id           integer       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol            varchar(20)   NOT NULL,
      side              varchar(4)    NOT NULL CHECK (side IN ('BUY', 'SELL')),
      type              varchar(6)    NOT NULL CHECK (type IN ('MARKET', 'LIMIT')),
      price             numeric(30,8) NOT NULL CHECK (price > 0),
      quantity          numeric(30,8) NOT NULL CHECK (quantity > 0),
      executed_quantity numeric(30,8) NOT NULL DEFAULT 0,
      reserved_cash     numeric(30,8) NOT NULL DEFAULT 0,
      reserve_fee_rate  numeric(10,6) NOT NULL DEFAULT 0,
      status            varchar(16)   NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED')),
      created_at        timestamptz   NOT NULL DEFAULT now(),
      updated_at        timestamptz   NOT NULL DEFAULT now()
    );
    CREATE INDEX orders_user_created_idx ON orders (user_id, created_at DESC);
    CREATE INDEX orders_symbol_status_idx ON orders (symbol, status);

    CREATE TABLE order_book (
      id                 serial PRIMARY KEY,
      order_id           integer       NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      symbol             varchar(20)   NOT NULL,
      side               varchar(4)    NOT NULL CHECK (side IN ('BUY', 'SELL')),
      price              numeric(30,8) NOT NULL,
      remaining_quantity numeric(30,8) NOT NULL,
      created_at         timestamptz   NOT NULL DEFAULT now()
    );
    CREATE INDEX order_book_match_idx ON order_book (symbol, side, price, created_at);

    CREATE TABLE matches (
      id            serial PRIMARY KEY,
      buy_order_id  integer       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      sell_order_id integer       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      symbol        varchar(20)   NOT NULL,
      quantity      numeric(30,8) NOT NULL,
      price         numeric(30,8) NOT NULL,
      created_at    timestamptz   NOT NULL DEFAULT now()
    );

    CREATE TABLE trades (
      id         serial PRIMARY KEY,
      user_id    integer       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol     varchar(20)   NOT NULL,
      side       varchar(4)    NOT NULL CHECK (side IN ('BUY', 'SELL')),
      role       varchar(5)    NOT NULL CHECK (role IN ('MAKER', 'TAKER')),
      quantity   numeric(30,8) NOT NULL,
      price      numeric(30,8) NOT NULL,
      total_cost numeric(30,8) NOT NULL,
      fee        numeric(30,8) NOT NULL DEFAULT 0,
      match_id   integer       NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      created_at timestamptz   NOT NULL DEFAULT now()
    );
    CREATE INDEX trades_user_created_idx ON trades (user_id, created_at DESC);

    -- Sổ phí sàn thu được: mỗi lần khớp 2 dòng (phí MAKER + phí TAKER), payer_id = người trả.
    CREATE TABLE admin_fee_records (
      id             serial PRIMARY KEY,
      match_id       integer       NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      buyer_id       integer       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seller_id      integer       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payer_id       integer       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol         varchar(20)   NOT NULL,
      trading_volume numeric(30,8) NOT NULL,
      fee_amount     numeric(30,8) NOT NULL,
      fee_type       varchar(5)    NOT NULL CHECK (fee_type IN ('MAKER', 'TAKER')),
      status         varchar(10)   NOT NULL DEFAULT 'SETTLED',
      created_at     timestamptz   NOT NULL DEFAULT now()
    );

    CREATE TABLE deposit_transactions (
      id             serial PRIMARY KEY,
      user_id        integer       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      currency       varchar(10)   NOT NULL DEFAULT 'USDT',
      amount         numeric(30,8) NOT NULL CHECK (amount > 0),
      payment_method varchar(30)   NOT NULL,
      status         varchar(10)   NOT NULL DEFAULT 'COMPLETED',
      created_at     timestamptz   NOT NULL DEFAULT now()
    );

    CREATE TABLE chats (
      id         uuid PRIMARY KEY,
      user_id    integer      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      varchar(100),
      created_at timestamptz  NOT NULL DEFAULT now()
    );
    CREATE INDEX chats_user_created_idx ON chats (user_id, created_at DESC);

    ALTER TABLE users
      ADD CONSTRAINT users_last_active_chat_fk
      FOREIGN KEY (last_active_chat_id) REFERENCES chats(id) ON DELETE SET NULL;

    CREATE TABLE chat_messages (
      id         serial PRIMARY KEY,
      chat_id    uuid         NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role       varchar(10)  NOT NULL CHECK (role IN ('user', 'assistant')),
      content    text         NOT NULL,
      created_at timestamptz  NOT NULL DEFAULT now()
    );
    CREATE INDEX chat_messages_chat_idx ON chat_messages (chat_id, created_at);

    CREATE TABLE posts (
      id             serial PRIMARY KEY,
      user_id        integer      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content        text         NOT NULL,
      sentiment      varchar(10)  NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('bull', 'bear', 'neutral')),
      tags           jsonb        NOT NULL DEFAULT '[]'::jsonb,
      image_url      text,
      likes_count    integer      NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
      comments_count integer      NOT NULL DEFAULT 0,
      created_at     timestamptz  NOT NULL DEFAULT now()
    );
    CREATE INDEX posts_created_idx ON posts (created_at DESC);
    CREATE INDEX posts_tags_idx ON posts USING gin (tags);

    CREATE TABLE post_likes (
      post_id    integer     NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id    integer     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (post_id, user_id)
    );

    CREATE TABLE news (
      id           serial PRIMARY KEY,
      title        varchar(300) NOT NULL,
      summary      text,
      content      text,
      image        text,
      source       varchar(100),
      source_url   text,
      category     varchar(20)  NOT NULL DEFAULT 'macro'
                     CHECK (category IN ('macro', 'bitcoin', 'altcoin', 'defi', 'nft', 'regulation')),
      status       varchar(10)  NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
      views        integer      NOT NULL DEFAULT 0,
      likes        integer      NOT NULL DEFAULT 0,
      is_featured  boolean      NOT NULL DEFAULT false,
      published_at timestamptz  NOT NULL DEFAULT now(),
      created_at   timestamptz  NOT NULL DEFAULT now()
    );
    CREATE INDEX news_published_idx ON news (status, published_at DESC);

    CREATE TABLE ai_recommendations (
      id                serial PRIMARY KEY,
      user_id           integer       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol            varchar(20)   NOT NULL,
      amount            numeric(30,8) NOT NULL,
      horizon           varchar(10)   NOT NULL,
      risk              varchar(20)   NOT NULL,
      experience        varchar(20)   NOT NULL,
      goal              varchar(20)   NOT NULL,
      style             varchar(20)   NOT NULL,
      max_risk_pct      numeric(8,4)  NOT NULL,
      report_depth      varchar(20)   NOT NULL,
      tone              varchar(20),
      stop_loss_kind    varchar(20),
      profit_target_pct numeric(8,4),
      market_bias       varchar(20),
      entry_strategy    varchar(20),
      direction         varchar(10)   NOT NULL,
      confidence        integer       NOT NULL,
      entry_price       numeric(30,8) NOT NULL,
      stop_loss         numeric(30,8) NOT NULL,
      take_profit       numeric(30,8) NOT NULL,
      position_size     numeric(30,8) NOT NULL,
      leverage          integer       NOT NULL DEFAULT 1,
      liquidation_price numeric(30,8),
      ai_narrative      text,
      ai_reasons        jsonb         NOT NULL DEFAULT '[]'::jsonb,
      ai_key_points     jsonb         NOT NULL DEFAULT '[]'::jsonb,
      status            varchar(10)   NOT NULL DEFAULT 'OPEN'
                          CHECK (status IN ('OPEN', 'HIT_TP', 'HIT_SL', 'EXPIRED')),
      pnl               numeric(30,8) NOT NULL DEFAULT 0,
      exit_price        numeric(30,8),
      closed_at         timestamptz,
      model             varchar(100),
      elapsed_ms        integer       NOT NULL DEFAULT 0,
      created_at        timestamptz   NOT NULL DEFAULT now(),
      updated_at        timestamptz   NOT NULL DEFAULT now()
    );
    CREATE INDEX ai_recommendations_user_idx ON ai_recommendations (user_id, created_at DESC);
    CREATE INDEX ai_recommendations_open_idx ON ai_recommendations (status) WHERE status = 'OPEN';

    -- Phí mặc định toàn sàn (khớp DEFAULT_MAKER_FEE / DEFAULT_TAKER_FEE trong server/dtos/order.ts).
    INSERT INTO trading_fee_config (fee_type, fee_rate, symbol_pattern) VALUES
      ('MAKER', 0.0005, '*'),
      ('TAKER', 0.0010, '*');
  `)
}

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_last_active_chat_fk;
    DROP TABLE IF EXISTS ai_recommendations, news, post_likes, posts, chat_messages, chats,
      deposit_transactions, admin_fee_records, trades, matches, order_book, orders,
      trading_fee_config, wallet_holdings, virtual_coins, wallets, users CASCADE;
  `)
}
