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
    utils::email::EmailService,
};
use bcrypt::{hash, verify, DEFAULT_COST};

fn generate_otp() -> String {
    use rand::Rng;
    format!("{:06}", rand::thread_rng().gen_range(100_000u32..=999_999u32))
}

fn generate_reset_token() -> String {
    Uuid::new_v4().to_string().replace('-', "")
}

const USER_COLS: &str =
    "id, email, username, password_hash, role, is_verified, created_at, updated_at";

// ── Health ────────────────────────────────────────────────────────────────────

#[rocket::get("/health")]
pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        timestamp: Utc::now().to_rfc3339(),
    })
}

// ── Register ──────────────────────────────────────────────────────────────────

#[rocket::post("/auth/register", format = "json", data = "<req>")]
pub async fn register(
    req: Json<RegisterRequest>,
    pool: &State<DbPool>,
    email_svc: &State<EmailService>,
) -> Result<Json<ApiResponse<RegisterResponse>>> {
    if req.email.is_empty() || req.username.is_empty() || req.password.is_empty() {
        return Err(ApiError::ValidationError("Email, username, and password are required".into()));
    }
    if req.password.len() < 8 {
        return Err(ApiError::ValidationError("Password must be at least 8 characters".into()));
    }

    let existing: Option<(String,)> = sqlx::query_as(
        "SELECT email FROM users WHERE email = $1 OR username = $2",
    )
    .bind(&req.email)
    .bind(&req.username)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?;

    if existing.is_some() {
        return Err(ApiError::UserAlreadyExists);
    }

    let password = req.password.clone();
    let password_hash = tokio::task::spawn_blocking(move || hash(&password, DEFAULT_COST))
        .await
        .map_err(|_| ApiError::InternalError)?
        .map_err(|e| { tracing::error!("bcrypt: {e}"); ApiError::InternalError })?;

    let user_id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO users (id, email, username, password_hash, role, is_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'user', false, $5, $6)",
    )
    .bind(user_id).bind(&req.email).bind(&req.username)
    .bind(&password_hash).bind(now).bind(now)
    .execute(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?;

    let otp = generate_otp();
    send_otp(pool.inner(), user_id, &otp).await?;
    email_svc.send_otp(&req.email, &req.username, &otp).await;

    tracing::info!("Registered (unverified): {} ({})", req.email, user_id);
    Ok(Json(ApiResponse::ok_with_message(
        RegisterResponse { email: req.email.clone() },
        "Check your email for a 6-digit verification code",
    )))
}

// ── Verify email ──────────────────────────────────────────────────────────────

#[rocket::post("/auth/verify-email", format = "json", data = "<req>")]
pub async fn verify_email(
    req: Json<VerifyEmailRequest>,
    pool: &State<DbPool>,
    jwt_manager: &State<JwtManager>,
) -> Result<Json<ApiResponse<AuthResponse>>> {
    let user: User = sqlx::query_as(&format!(
        "SELECT {USER_COLS} FROM users WHERE email = $1"
    ))
    .bind(&req.email)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?
    .ok_or(ApiError::InvalidCredentials)?;

    if user.is_verified {
        return Err(ApiError::BadRequest("Email is already verified".into()));
    }

    let now = Utc::now();
    let valid: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM email_verifications
         WHERE user_id = $1 AND otp_code = $2 AND expires_at > $3
         ORDER BY created_at DESC LIMIT 1",
    )
    .bind(user.id).bind(&req.otp).bind(now)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?;

    if valid.is_none() {
        return Err(ApiError::ValidationError("Invalid or expired code".into()));
    }

    sqlx::query("UPDATE users SET is_verified = true, updated_at = $1 WHERE id = $2")
        .bind(now).bind(user.id)
        .execute(pool.inner()).await
        .map_err(|e| ApiError::Database(e.to_string()))?;

    sqlx::query("DELETE FROM email_verifications WHERE user_id = $1")
        .bind(user.id)
        .execute(pool.inner()).await
        .map_err(|e| ApiError::Database(e.to_string()))?;

    let token = jwt_manager.generate_token(user.id, &user.email)?;
    tracing::info!("Email verified: {} ({})", user.email, user.id);
    Ok(Json(ApiResponse::ok_with_message(
        AuthResponse { user: user.into(), token },
        "Email verified",
    )))
}

// ── Resend OTP ────────────────────────────────────────────────────────────────

#[rocket::post("/auth/resend-otp", format = "json", data = "<req>")]
pub async fn resend_otp(
    req: Json<ResendOtpRequest>,
    pool: &State<DbPool>,
    email_svc: &State<EmailService>,
) -> Result<Json<ApiResponse<()>>> {
    let user: Option<User> = sqlx::query_as(&format!(
        "SELECT {USER_COLS} FROM users WHERE email = $1"
    ))
    .bind(&req.email)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?;

    // Don't reveal whether the email exists
    if let Some(user) = user {
        if !user.is_verified {
            let otp = generate_otp();
            send_otp(pool.inner(), user.id, &otp).await?;
            email_svc.send_otp(&user.email, &user.username, &otp).await;
        }
    }

    Ok(Json(ApiResponse::ok_with_message((), "If that email is registered, a new code was sent")))
}

// ── Login ─────────────────────────────────────────────────────────────────────

#[rocket::post("/auth/login", format = "json", data = "<req>")]
pub async fn login(
    req: Json<LoginRequest>,
    pool: &State<DbPool>,
    jwt_manager: &State<JwtManager>,
    email_svc: &State<EmailService>,
) -> Result<Json<ApiResponse<AuthResponse>>> {
    if req.email.is_empty() || req.password.is_empty() {
        return Err(ApiError::ValidationError("Email and password are required".into()));
    }

    let user: User = sqlx::query_as(&format!(
        "SELECT {USER_COLS} FROM users WHERE email = $1"
    ))
    .bind(&req.email)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?
    .ok_or(ApiError::InvalidCredentials)?;

    let hash_copy = user.password_hash.clone();
    let password = req.password.clone();
    let valid = tokio::task::spawn_blocking(move || verify(&password, &hash_copy))
        .await
        .map_err(|_| ApiError::InternalError)?
        .map_err(|_| ApiError::InvalidCredentials)?;

    if !valid {
        return Err(ApiError::InvalidCredentials);
    }

    if !user.is_verified {
        // Re-send a fresh OTP so they can complete verification
        let otp = generate_otp();
        send_otp(pool.inner(), user.id, &otp).await?;
        email_svc.send_otp(&user.email, &user.username, &otp).await;
        return Err(ApiError::BadRequest("email_not_verified".into()));
    }

    let token = jwt_manager.generate_token(user.id, &user.email)?;
    tracing::info!("Login: {} ({})", user.email, user.id);
    Ok(Json(ApiResponse::ok(AuthResponse { user: user.into(), token })))
}

// ── Profile ───────────────────────────────────────────────────────────────────

#[rocket::get("/profile")]
pub async fn get_profile(
    guard: AuthGuard,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<UserResponse>>> {
    let user: User = sqlx::query_as(&format!(
        "SELECT {USER_COLS} FROM users WHERE id = $1"
    ))
    .bind(Uuid::parse_str(&guard.claims.sub).map_err(|_| ApiError::InvalidToken)?)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?
    .ok_or(ApiError::NotFound)?;

    Ok(Json(ApiResponse::ok(user.into())))
}

// ── Forgot password ───────────────────────────────────────────────────────────

#[rocket::post("/auth/forgot-password", format = "json", data = "<req>")]
pub async fn forgot_password(
    req: Json<ForgotPasswordRequest>,
    pool: &State<DbPool>,
    email_svc: &State<EmailService>,
) -> Result<Json<ApiResponse<()>>> {
    let user: Option<User> = sqlx::query_as(&format!(
        "SELECT {USER_COLS} FROM users WHERE email = $1"
    ))
    .bind(&req.email)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?;

    if let Some(user) = user {
        let token = generate_reset_token();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        sqlx::query(
            "DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < NOW()",
        )
        .bind(user.id)
        .execute(pool.inner()).await
        .map_err(|e| ApiError::Database(e.to_string()))?;

        sqlx::query(
            "INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)",
        )
        .bind(Uuid::new_v4()).bind(user.id).bind(&token).bind(expires_at)
        .execute(pool.inner()).await
        .map_err(|e| ApiError::Database(e.to_string()))?;

        email_svc.send_password_reset(&user.email, &token).await;
    }

    Ok(Json(ApiResponse::ok_with_message(
        (),
        "If that email is registered you'll receive a reset link shortly",
    )))
}

// ── Reset password ────────────────────────────────────────────────────────────

#[rocket::post("/auth/reset-password", format = "json", data = "<req>")]
pub async fn reset_password(
    req: Json<ResetPasswordRequest>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<()>>> {
    if req.new_password.len() < 8 {
        return Err(ApiError::ValidationError("Password must be at least 8 characters".into()));
    }

    let now = Utc::now();
    let row: Option<(Uuid, Uuid)> = sqlx::query_as(
        "SELECT id, user_id FROM password_reset_tokens
         WHERE token = $1 AND expires_at > $2 AND used_at IS NULL",
    )
    .bind(&req.token).bind(now)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?;

    let (token_id, user_id) = row.ok_or_else(|| {
        ApiError::BadRequest("Invalid or expired reset link".into())
    })?;

    let new_password = req.new_password.clone();
    let password_hash = tokio::task::spawn_blocking(move || hash(&new_password, DEFAULT_COST))
        .await
        .map_err(|_| ApiError::InternalError)?
        .map_err(|e| { tracing::error!("bcrypt: {e}"); ApiError::InternalError })?;

    sqlx::query("UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3")
        .bind(&password_hash).bind(now).bind(user_id)
        .execute(pool.inner()).await
        .map_err(|e| ApiError::Database(e.to_string()))?;

    sqlx::query("UPDATE password_reset_tokens SET used_at = $1 WHERE id = $2")
        .bind(now).bind(token_id)
        .execute(pool.inner()).await
        .map_err(|e| ApiError::Database(e.to_string()))?;

    Ok(Json(ApiResponse::ok_with_message((), "Password updated successfully")))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async fn send_otp(pool: &crate::db::DbPool, user_id: Uuid, otp: &str) -> Result<()> {
    let expires_at = Utc::now() + chrono::Duration::minutes(10);
    sqlx::query("DELETE FROM email_verifications WHERE user_id = $1")
        .bind(user_id)
        .execute(pool).await
        .map_err(|e| ApiError::Database(e.to_string()))?;
    sqlx::query(
        "INSERT INTO email_verifications (id, user_id, otp_code, expires_at) VALUES ($1, $2, $3, $4)",
    )
    .bind(Uuid::new_v4()).bind(user_id).bind(otp).bind(expires_at)
    .execute(pool).await
    .map_err(|e| ApiError::Database(e.to_string()))?;
    Ok(())
}
