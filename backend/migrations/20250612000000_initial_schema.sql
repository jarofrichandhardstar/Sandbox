CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    username      VARCHAR(100) NOT NULL,
    password_hash TEXT         NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'user',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS inventory_items (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    sku         VARCHAR(100) NOT NULL UNIQUE,
    description TEXT         NOT NULL DEFAULT '',
    price       DOUBLE PRECISION NOT NULL DEFAULT 0,
    cost        DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_published BOOLEAN     NOT NULL DEFAULT FALSE,
    image_url   TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_sku         ON inventory_items (sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_published ON inventory_items (is_published);

CREATE TABLE IF NOT EXISTS stock (
    id                 UUID         PRIMARY KEY,
    inventory_item_id  UUID         NOT NULL UNIQUE REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity_in_stock  INTEGER      NOT NULL DEFAULT 0,
    reorder_level      INTEGER      NOT NULL DEFAULT 0,
    reorder_quantity   INTEGER      NOT NULL DEFAULT 0,
    warehouse_location VARCHAR(255) NOT NULL DEFAULT '',
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
