# Rust Backend

A production-ready Rust REST API backend built with Rocket framework, featuring JWT authentication, PostgreSQL integration, and comprehensive error handling.

## Features

- **Rocket Web Framework** — Fast, type-safe async web framework
- **PostgreSQL Database** — With SQLx for compile-time query verification
- **JWT Authentication** — Stateless authentication with Bcrypt password hashing
- **Error Handling** — Centralized error responses with proper HTTP status codes
- **Logging & Tracing** — Structured logging for observability
- **Configuration Management** — Environment-based configuration
- **Type Safety** — Full Rust type safety throughout
- **Role-Based Access Control** — Admin and User roles for permission management
- **Inventory Management System** — CRUD operations for products and inventory
- **Stock Management** — Real-time inventory tracking with reorder levels
- **Product Publishing** — Control which inventory items are visible to users
- **Product Search** — Public product search with filtering
- **Shopping Cart + Checkout** — Cart endpoints, order creation, payment simulation, and stock validation
- **Shipping Coverage** — Shipping rate lookup by city/postal code and admin-managed coverage

## Project Structure

```
backend/
├── src/
│   ├── main.rs              # Application entry point
│   ├── config.rs            # Configuration management
│   ├── errors.rs            # Custom error types
│   ├── auth/                # JWT authentication logic
│   ├── middleware/          # Request guards and middleware
│   ├── handlers/            # HTTP route handlers
│   │   ├── mod.rs           # User auth handlers
│   │   ├── admin.rs         # Admin inventory/stock handlers
│   │   └── products.rs      # Public product handlers
│   ├── models/              # Data structures and DTOs
│   ├── db/                  # Database initialization
│   └── utils/               # Helper functions
│       └── images.rs        # Image handling utilities
├── tests/                   # Integration tests
├── migrations/              # Database migrations
├── uploads/                 # Product images (git-ignored)
│   └── products/            # Uploaded product images
├── Cargo.toml               # Project manifest
└── .env.example             # Environment template
```

## Architecture Overview

### Admin Panel Flow
1. **Admin registers/logs in** → Receives JWT token
2. **Admin creates inventory items** → Items stored with `is_published = false`
3. **Admin manages stock levels** → Track quantity, reorder levels
4. **Admin publishes items** → Sets `is_published = true`
5. **Items visible on user side** → Published items appear in product catalog

### User Side Flow
1. **User registers/logs in** → Receives JWT token
2. **User browses published products** → Only sees items with `is_published = true`
3. **User checks product details** → Name, description, price, stock status
4. **User searches products** → Full-text search across published items

### Database Schema

**Users Table:**
- `id` (UUID) — Primary key
- `email` (String, unique) — User email
- `username` (String, unique) — Display name
- `password_hash` (String) — Bcrypt-hashed password
- `role` (String) — "admin" or "user" role
- `created_at`, `updated_at` — Timestamps

**Inventory Items Table:**
- `id` (UUID) — Primary key
- `name`, `sku`, `description` — Product details
- `price`, `cost` — Financial data (profit margin calculated from these)
- `is_published` (Boolean) — Controls visibility to users
- `image_url` (String, nullable) — URL path to product image
- `created_at`, `updated_at` — Timestamps

**Stock Table:**
- `id` (UUID) — Primary key
- `inventory_item_id` (UUID, FK) — Link to inventory item
- `quantity_in_stock` (Integer) — Current stock level
- `reorder_level` (Integer) — Threshold for reordering
- `reorder_quantity` (Integer) — How many units to order
- `warehouse_location` (String) — Physical storage location
- `updated_at` — Last update timestamp

### Image Management

**Image Storage:**
- Images are stored in `uploads/products/` directory on the server
- Files are automatically generated with unique names: `{UUID}_{timestamp}.{ext}`
- Maximum file size: 5 MB
- Supported formats: JPEG, PNG, WebP, GIF

**Image Flow:**
1. Admin uploads image via POST `/api/admin/inventory/{id}/image`
2. Image is saved to disk with unique filename
3. Image URL is stored in `inventory_items.image_url` column
4. URL path follows pattern: `/api/images/{filename}`
5. Users access images via GET `/api/images/{filename}`
6. When product is deleted, image file is also deleted

**Security:**
- Directory traversal attacks prevented (no `..` or `/` in filenames)
- MIME type validation ensures only images are uploaded
- File size limits prevent large uploads

### Security

- **Role-Based Access Control** — Only admins can manage inventory
- **JWT Protection** — Endpoints secured with Bearer token authentication
- **Password Hashing** — Bcrypt with salt
- **SQL Injection Prevention** — SQLx compile-time query verification
- **Type Safety** — Rust's type system prevents many common bugs

## Prerequisites

- Rust 1.70+ (install from https://rustup.rs/)
- PostgreSQL 12+ (running locally or via Docker)
- Cargo (comes with Rust)

## Setup

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 2. Clone and Setup Project

```bash
cd backend
cp .env.example .env
```

### 3. Configure Environment

Edit `.env` with your settings:

```env
DATABASE_URL=postgres://user:password@localhost:5432/rust_backend
JWT_SECRET=your-secret-key-change-in-production
PORT=8000
RUST_LOG=info
```

### 4. Setup PostgreSQL

```bash
# Create database
createdb rust_backend

# Or with Docker:
docker run --name postgres_rust -e POSTGRES_PASSWORD=password -e POSTGRES_DB=rust_backend -p 5432:5432 -d postgres:15
```

### 5. Run Migrations

Install sqlx-cli if not already installed:

```bash
cargo install sqlx-cli --no-default-features --features postgres
```

Create and run migrations:

```bash
# Create users table migration
sqlx migrate add -r init_users

# Create inventory items table migration
sqlx migrate add -r init_inventory

# Create stock table migration
sqlx migrate add -r init_stock

# Create cart/orders/shipping migration
sqlx migrate add -r add_orders_cart_shipping
```

Edit each migration file (in `migrations/` folder) with the SQL below, then run:

```bash
sqlx migrate run
```

### Sample Migrations

**migrations/YYYYMMDDHHMMSS_init_users.up.sql:**
```sql
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
CREATE INDEX idx_users_role ON users(role);
```

**migrations/YYYYMMDDHHMMSS_init_inventory.up.sql:**
```sql
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

CREATE INDEX idx_inventory_published ON inventory_items(is_published);
CREATE INDEX idx_inventory_created_at ON inventory_items(created_at DESC);
```

**migrations/YYYYMMDDHHMMSS_init_stock.up.sql:**
```sql
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
```

## Building

```bash
# Debug build
cargo build

# Release build (optimized)
cargo build --release
```

## Running

```bash
# Development mode with hot reload (requires cargo-watch)
cargo install cargo-watch
cargo watch -x run

# Or standard run
cargo run

# Or run release binary
./target/release/rust-backend
```

The server will start on `http://localhost:8000`

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-06-03T10:30:00Z"
}
```

### Authentication Endpoints

#### User Registration

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "secure_password"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "john_doe",
      "created_at": "2026-06-03T10:30:00Z"
    },
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  },
  "message": "User registered successfully"
}
```

#### User Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "john_doe",
      "created_at": "2026-06-03T10:30:00Z"
    },
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  },
  "message": "Success"
}
```

#### Get User Profile (Protected)

```bash
GET /api/profile
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "john_doe",
    "created_at": "2026-06-03T10:30:00Z"
  },
  "message": "Success"
}
```

### Admin Endpoints (Inventory Management)

**Note:** All admin endpoints require `Authorization: Bearer <token>` header and admin role.

#### Create Inventory Item

```bash
POST /api/admin/inventory
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "name": "Laptop",
  "sku": "LAPTOP-001",
  "description": "High-performance laptop",
  "price": 999.99,
  "cost": 600.00
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Laptop",
    "sku": "LAPTOP-001",
    "description": "High-performance laptop",
    "price": 999.99,
    "cost": 600.00,
    "is_published": false,
    "stock": null,
    "profit_margin": 39.96,
    "created_at": "2026-06-13T10:30:00Z",
    "updated_at": "2026-06-13T10:30:00Z"
  },
  "message": "Inventory item created successfully"
}
```

#### List All Inventory Items (Admin View)

```bash
GET /api/admin/inventory
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Laptop",
      "sku": "LAPTOP-001",
      "description": "High-performance laptop",
      "price": 999.99,
      "cost": 600.00,
      "is_published": false,
      "image_url": "/api/images/550e8400-e29b-41d4-a716-446655440001_1686658200.jpg",
      "stock": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "quantity_in_stock": 50,
        "reorder_level": 10,
        "reorder_quantity": 50,
        "warehouse_location": "Warehouse A",
        "needs_reorder": false
      },
      "profit_margin": 39.96,
      "created_at": "2026-06-13T10:30:00Z",
      "updated_at": "2026-06-13T10:30:00Z"
    }
  ],
  "message": "Success"
}
```

#### Get Single Inventory Item

```bash
GET /api/admin/inventory/<id>
Authorization: Bearer <admin_token>
```

#### Update Inventory Item

```bash
PUT /api/admin/inventory/<id>
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "name": "Gaming Laptop",
  "price": 1299.99
}
```

#### Delete Inventory Item

```bash
DELETE /api/admin/inventory/<id>
Authorization: Bearer <admin_token>
```

#### Publish/Unpublish Inventory Item

Toggles the published status (makes it visible to users):

```bash
POST /api/admin/inventory/<id>/publish
Authorization: Bearer <admin_token>
```

#### Upload Product Image

Upload an image for an inventory item:

```bash
POST /api/admin/inventory/<id>/image
Authorization: Bearer <admin_token>
Content-Type: application/octet-stream

[binary image data]
```

Supported formats: JPEG, PNG, WebP, GIF (max 5MB)

Response:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "image_url": "/api/images/550e8400-e29b-41d4-a716-446655440001_1686658200.jpg",
    "message": "Image uploaded successfully"
  },
  "message": "Image uploaded successfully"
}
```

#### Delete Product Image

Remove the image from an inventory item:

```bash
DELETE /api/admin/inventory/<id>/image
Authorization: Bearer <admin_token>
```

#### Initialize Stock for Inventory Item

```bash
POST /api/admin/stock/<inventory_id>
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "quantity_in_stock": 50,
  "reorder_level": 10,
  "reorder_quantity": 50,
  "warehouse_location": "Warehouse A"
}
```

#### Update Stock Levels

```bash
PUT /api/admin/stock/<stock_id>
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "quantity_in_stock": 45,
  "reorder_level": 15
}
```

### User Product Endpoints (Published Products)

**Note:** These endpoints are public and show only published inventory items.

#### List Published Products

```bash
GET /api/products
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Laptop",
      "sku": "LAPTOP-001",
      "description": "High-performance laptop",
      "price": 999.99,
      "in_stock": true
    }
  ],
  "message": "Success"
}
```

#### Get Single Published Product

```bash
GET /api/products/<id>
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Laptop",
    "sku": "LAPTOP-001",
    "description": "High-performance laptop",
    "price": 999.99,
    "in_stock": true
  },
  "message": "Success"
}
```

#### Search Published Products

```bash
GET /api/products/search?query=laptop
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Gaming Laptop",
      "sku": "LAPTOP-001",
      "description": "High-performance gaming laptop",
      "price": 1299.99,
      "in_stock": true,
      "image_url": "/api/images/550e8400-e29b-41d4-a716-446655440001_1686658200.jpg"
    }
  ],
  "message": "Success"
}
```

### Image Serving

#### Get Product Image

Serve product images by filename:

```bash
GET /api/images/{filename}
```

Example:
```bash
curl http://localhost:8000/api/images/550e8400-e29b-41d4-a716-446655440001_1686658200.jpg
```

Returns the image file with appropriate Content-Type header.

## Testing

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_name
```

## Common Issues & Solutions

### "Connection refused" for PostgreSQL

Ensure PostgreSQL is running:

```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Docker
docker start postgres_rust
```

### "Database does not exist"

```bash
createdb rust_backend
```

### JWT token verification fails

Ensure `JWT_SECRET` in `.env` matches the value used to generate tokens.

### Port already in use

Change `PORT` in `.env` or:

```bash
PORT=3000 cargo run
```

## Dependencies

- **rocket** — Web framework
- **tokio** — Async runtime
- **sqlx** — Type-safe SQL toolkit
- **serde** — Serialization framework
- **jsonwebtoken** — JWT creation/verification
- **bcrypt** — Password hashing
- **tracing** — Structured logging
- **uuid** — UUID generation
- **chrono** — DateTime handling
- **thiserror** — Error handling

## Next Steps

- Implement order management (users can place orders)
- Add shopping cart functionality
- Implement payment processing integration
- Add inventory alerts for low stock
- Create discount/coupon system
- Implement product categories and filtering
- Add review and rating system for products
- Set up email notifications for inventory events
- Add admin dashboard with analytics
- Implement user wish lists
- Add shipping integration
- Deploy with Docker and Kubernetes
- Set up CI/CD pipeline

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `cargo test`
4. Format code: `cargo fmt`
5. Check lints: `cargo clippy`
6. Submit a pull request

## License

MIT License

## Support

For issues or questions, open an issue on GitHub or check the Rocket documentation: https://rocket.rs
