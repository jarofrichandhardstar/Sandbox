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
│   ├── models/              # Data structures and DTOs
│   ├── db/                  # Database initialization
│   └── utils/               # Helper functions
├── tests/                   # Integration tests
├── migrations/              # Database migrations
├── Cargo.toml               # Project manifest
└── .env.example             # Environment template
```

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
sqlx migrate add -r init_users
# Edit the migration file in migrations/
sqlx migrate run
```

### Sample Migration (migrations/YYYYMMDDHHMMSS_init_users.up.sql)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
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

### User Registration

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

### User Login

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

### Get User Profile (Protected)

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

- Add more CRUD endpoints for your domain models
- Implement pagination for list endpoints
- Add request validation middleware
- Set up rate limiting
- Add caching with Redis
- Implement role-based access control (RBAC)
- Add comprehensive test coverage
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
