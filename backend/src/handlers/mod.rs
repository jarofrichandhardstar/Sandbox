pub mod admin;
pub mod content;
pub mod orders;
pub mod products;

use rocket::{http::Status, serde::json::Json, State};
use uuid::Uuid;
use chrono::Utc;

use crate::{
    auth::JwtManager,
    db::DbPool,
    errors::{ApiError, Result},
    models::*,
    middleware::AuthGuard,
};
use bcrypt::{hash, verify, DEFAULT_COST};

// Health check endpoint
#[rocket::get("/health")]
pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        timestamp: Utc::now().to_rfc3339(),
    })
}

// Register endpoint
#[rocket::post("/auth/register", format = "json", data = "<req>")]
pub async fn register(
    req: Json<RegisterRequest>,
    pool: &State<DbPool>,
    jwt_manager: &State<JwtManager>,
) -> Result<Json<ApiResponse<AuthResponse>>> {
    // Validate input
    if req.email.is_empty() || req.username.is_empty() || req.password.is_empty() {
        return Err(ApiError::ValidationError(
            "Email, username, and password are required".to_string(),
        ));
    }

    // Check if user already exists
    let existing_user: Option<(String,)> = sqlx::query_as(
        "SELECT email FROM users WHERE email = $1 OR username = $2"
    )
    .bind(&req.email)
    .bind(&req.username)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    if existing_user.is_some() {
        return Err(ApiError::UserAlreadyExists);
    }

    // Hash password
    let password_hash = hash(&req.password, DEFAULT_COST)
        .map_err(|e| {
            tracing::error!("Password hashing error: {}", e);
            ApiError::InternalError
        })?;

    // Create new user
    let user_id = Uuid::new_v4();
    let now = Utc::now();

    let user: User = sqlx::query_as(
        "INSERT INTO users (id, email, username, password_hash, role, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, 'user', $5, $6)
         RETURNING id, email, username, password_hash, role, created_at, updated_at"
    )
    .bind(user_id)
    .bind(&req.email)
    .bind(&req.username)
    .bind(&password_hash)
    .bind(now)
    .bind(now)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    // Generate token
    let token = jwt_manager.generate_token(user.id, &user.email)?;

    tracing::info!("User registered: {} ({})", user.email, user.id);

    Ok(Json(ApiResponse::ok_with_message(
        AuthResponse {
            user: user.into(),
            token,
        },
        "User registered successfully",
    )))
}

// Login endpoint
#[rocket::post("/auth/login", format = "json", data = "<req>")]
pub async fn login(
    req: Json<LoginRequest>,
    pool: &State<DbPool>,
    jwt_manager: &State<JwtManager>,
) -> Result<Json<ApiResponse<AuthResponse>>> {
    // Validate input
    if req.email.is_empty() || req.password.is_empty() {
        return Err(ApiError::ValidationError(
            "Email and password are required".to_string(),
        ));
    }

    // Fetch user
    let user: User = sqlx::query_as(
        "SELECT id, email, username, password_hash, role, created_at, updated_at FROM users WHERE email = $1"
    )
    .bind(&req.email)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?
    .ok_or(ApiError::InvalidCredentials)?;

    // Verify password
    verify(&req.password, &user.password_hash)
        .map_err(|_| {
            tracing::warn!("Invalid password for user: {}", user.email);
            ApiError::InvalidCredentials
        })?;

    // Generate token
    let token = jwt_manager.generate_token(user.id, &user.email)?;

    tracing::info!("User logged in: {} ({})", user.email, user.id);

    Ok(Json(ApiResponse::ok(AuthResponse {
        user: user.into(),
        token,
    })))
}

// Protected endpoint example
#[rocket::get("/profile")]
pub async fn get_profile(
    guard: AuthGuard,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<UserResponse>>> {
    let user: User = sqlx::query_as(
        "SELECT id, email, username, password_hash, role, created_at, updated_at FROM users WHERE id = $1"
    )
    .bind(Uuid::parse_str(&guard.claims.sub).map_err(|_| ApiError::InvalidToken)?)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?
    .ok_or(ApiError::NotFound)?;

    Ok(Json(ApiResponse::ok(user.into())))
}
