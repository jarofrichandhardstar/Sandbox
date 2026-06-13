// Database migration templates
// To create a migration, use: sqlx migrate add -r migration_name

// ============================================
// Migration 1: Initial Users Table (20260603000000_init_users.up.sql)
// ============================================

/*
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
*/

// ============================================
// Migration 2: Inventory Items Table (20260613000000_init_inventory.up.sql)
// ============================================

/*
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_published ON inventory_items(is_published);
CREATE INDEX idx_inventory_created_at ON inventory_items(created_at DESC);
*/

// ============================================
// Migration 3: Stock Table (20260613000001_init_stock.up.sql)
// ============================================

/*
CREATE TABLE stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity_in_stock INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 10,
    reorder_quantity INTEGER NOT NULL DEFAULT 50,
    warehouse_location VARCHAR(255) NOT NULL DEFAULT 'Default Warehouse',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_inventory_item_id ON stock(inventory_item_id);
CREATE UNIQUE INDEX idx_stock_unique_item ON stock(inventory_item_id);
*/

// ============================================
// Running Migrations
// ============================================

// Installation (if not already installed):
// cargo install sqlx-cli --no-default-features --features postgres

// Create new migration files:
// sqlx migrate add -r init_users
// sqlx migrate add -r init_inventory
// sqlx migrate add -r init_stock

// Run all pending migrations:
// sqlx migrate run

// Revert last migration:
// sqlx migrate revert

// View migration status:
// sqlx migrate info

