use rocket::{serde::json::Json, State};
use chrono::Utc;

use crate::{
    db::DbPool,
    errors::{ApiError, Result},
    models::*,
    middleware::AdminGuard,
    utils::images,
};

/// GET /api/content — public endpoint, returns only is_public=true entries
#[rocket::get("/content")]
pub async fn list_public_content(
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<Vec<SiteContentResponse>>>> {
    let rows: Vec<SiteContent> = sqlx::query_as(
        "SELECT key, value, label, description, content_type, section, is_public, updated_at
         FROM site_content WHERE is_public = true ORDER BY section, key"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?;

    Ok(Json(ApiResponse::ok(rows.into_iter().map(|r| r.into()).collect())))
}

/// GET /api/admin/content — all entries (admin)
#[rocket::get("/content")]
pub async fn list_all_content(
    _guard: AdminGuard,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<Vec<SiteContentResponse>>>> {
    let rows: Vec<SiteContent> = sqlx::query_as(
        "SELECT key, value, label, description, content_type, section, is_public, updated_at
         FROM site_content ORDER BY section, key"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?;

    Ok(Json(ApiResponse::ok(rows.into_iter().map(|r| r.into()).collect())))
}

/// PUT /api/admin/content/<key>
#[rocket::put("/content/<key>", format = "json", data = "<req>")]
pub async fn update_content(
    _guard: AdminGuard,
    key: String,
    req: Json<UpdateContentRequest>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<SiteContentResponse>>> {
    let now = Utc::now();

    let row: SiteContent = sqlx::query_as(
        "UPDATE site_content SET value = $1, updated_at = $2 WHERE key = $3
         RETURNING key, value, label, description, content_type, section, is_public, updated_at"
    )
    .bind(&req.value)
    .bind(now)
    .bind(&key)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?
    .ok_or(ApiError::NotFound)?;

    Ok(Json(ApiResponse::ok_with_message(row.into(), "Content updated")))
}

/// POST /api/admin/content
#[rocket::post("/content", format = "json", data = "<req>")]
pub async fn create_content(
    _guard: AdminGuard,
    req: Json<CreateContentRequest>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<SiteContentResponse>>> {
    if req.key.is_empty() || req.label.is_empty() {
        return Err(ApiError::ValidationError("Key and label are required".into()));
    }

    // Reject keys with spaces or special characters
    if !req.key.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err(ApiError::ValidationError(
            "Key may only contain letters, digits, and underscores".into(),
        ));
    }

    let now = Utc::now();

    let row: SiteContent = sqlx::query_as(
        "INSERT INTO site_content (key, value, label, description, content_type, section, is_public, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING key, value, label, description, content_type, section, is_public, updated_at"
    )
    .bind(&req.key)
    .bind(&req.value)
    .bind(&req.label)
    .bind(&req.description)
    .bind(&req.content_type)
    .bind(&req.section)
    .bind(req.is_public)
    .bind(now)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        if e.to_string().contains("duplicate") || e.to_string().contains("unique") {
            ApiError::BadRequest(format!("Key '{}' already exists", req.key))
        } else {
            ApiError::Database(e.to_string())
        }
    })?;

    Ok(Json(ApiResponse::ok_with_message(row.into(), "Content item created")))
}

/// DELETE /api/admin/content/<key>
#[rocket::delete("/content/<key>")]
pub async fn delete_content(
    _guard: AdminGuard,
    key: String,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<serde_json::Value>>> {
    let result = sqlx::query("DELETE FROM site_content WHERE key = $1")
        .bind(&key)
        .execute(pool.inner())
        .await
        .map_err(|e| ApiError::Database(e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }

    Ok(Json(ApiResponse::ok_with_message(
        serde_json::json!({ "deleted": true }),
        "Content item deleted",
    )))
}

/// POST /api/admin/content/<key>/image — uploads a file and stores its URL as the content value
#[rocket::post("/content/<key>/image", format = "application/octet-stream", data = "<data>")]
pub async fn upload_content_image(
    _guard: AdminGuard,
    key: String,
    data: Vec<u8>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<SiteContentResponse>>> {
    // Verify key exists and is an image type
    let row: SiteContent = sqlx::query_as(
        "SELECT key, value, label, description, content_type, section, is_public, updated_at
         FROM site_content WHERE key = $1"
    )
    .bind(&key)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?
    .ok_or(ApiError::NotFound)?;

    if row.content_type != "image" {
        return Err(ApiError::BadRequest(
            "This content item does not accept an image".into(),
        ));
    }

    images::validate_file_size(data.len())?;

    let filename = images::generate_filename("content.jpg");
    let image_url = images::save_upload(&filename, &data)?;

    let now = Utc::now();
    let updated: SiteContent = sqlx::query_as(
        "UPDATE site_content SET value = $1, updated_at = $2 WHERE key = $3
         RETURNING key, value, label, description, content_type, section, is_public, updated_at"
    )
    .bind(&image_url)
    .bind(now)
    .bind(&key)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| ApiError::Database(e.to_string()))?;

    Ok(Json(ApiResponse::ok_with_message(updated.into(), "Image uploaded")))
}
