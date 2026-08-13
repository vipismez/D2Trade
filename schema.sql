-- D2Trade 数据库 Schema
-- Cloudflare D1 (SQLite)

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    password_hash TEXT  NOT NULL,
    qq          TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'player' CHECK(role IN ('player', 'gm')),
    status      TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    points      INTEGER NOT NULL DEFAULT 0 CHECK(points >= 0),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role   ON users(role);

-- 装备列表（市场）
CREATE TABLE IF NOT EXISTS listings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id   INTEGER NOT NULL REFERENCES users(id),
    item_name   TEXT    NOT NULL,
    item_attrs  TEXT    NOT NULL DEFAULT '{}',  -- JSON: 装备属性描述
    image_url   TEXT,                            -- 装备图片 URL（可空）
    price       INTEGER NOT NULL CHECK(price > 0),
    status      TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'sold', 'cancelled')),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_listings_seller  ON listings(seller_id);
CREATE INDEX idx_listings_status  ON listings(status);
CREATE INDEX idx_listings_price   ON listings(price);

-- 交易记录
CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT    NOT NULL CHECK(type IN ('trade', 'buyback', 'grant', 'rollback')),
    listing_id  INTEGER REFERENCES listings(id),
    buyer_id    INTEGER REFERENCES users(id),
    seller_id   INTEGER REFERENCES users(id),
    gm_id       INTEGER REFERENCES users(id),
    amount      INTEGER NOT NULL CHECK(amount > 0),
    status      TEXT    NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'rolled_back')),
    note        TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_transactions_buyer  ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_transactions_type   ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at);
