use rocket::{serde::json::Json, State};
use uuid::Uuid;

use crate::{
    db::DbPool,
    errors::{ApiError, Result},
    models::*,
};
use rocket::fs::NamedFile;
#[rocket::get("/products")]
pub async fn list_published_products(
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<Vec<PublishedProductResponse>>>> {
    let items: Vec<InventoryItem> = sqlx::query_as(
        "SELECT id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at
         FROM inventory_items WHERE is_published = true ORDER BY created_at DESC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let mut responses: Vec<PublishedProductResponse> = Vec::new();

    for item in items {
        let in_stock = check_in_stock(&item.id, pool).await?;
        
        responses.push(PublishedProductResponse {
            id: item.id.to_string(),
            name: item.name,
            sku: item.sku,
            description: item.description,
            price: item.price,
            in_stock,
            image_url: item.image_url,
        });
    }

    Ok(Json(ApiResponse::ok(responses)))
}

// Get single published product
#[rocket::get("/products/<id>")]
pub async fn get_published_product(
    id: String,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<PublishedProductResponse>>> {
    let item_id = Uuid::parse_str(&id).map_err(|_| ApiError::BadRequest("Invalid ID format".to_string()))?;

    let item: InventoryItem = sqlx::query_as(
        "SELECT id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at
         FROM inventory_items WHERE id = $1 AND is_published = true"
    )
    .bind(item_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?
    .ok_or(ApiError::NotFound)?;

    let in_stock = check_in_stock(&item_id, pool).await?;

    Ok(Json(ApiResponse::ok(PublishedProductResponse {
        id: item.id.to_string(),
        name: item.name,
        sku: item.sku,
        description: item.description,
        price: item.price,
        in_stock,
        image_url: item.image_url,
    })))
}

// Search published products
#[rocket::get("/products/search?<query>")]
pub async fn search_products(
    query: String,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<Vec<PublishedProductResponse>>>> {
    let search_term = format!("%{}%", query.to_lowercase());

    let items: Vec<InventoryItem> = sqlx::query_as(
        "SELECT id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at
         FROM inventory_items
         WHERE is_published = true AND (LOWER(name) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(sku) LIKE $1)
         ORDER BY created_at DESC"
    )
    .bind(&search_term)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let mut responses: Vec<PublishedProductResponse> = Vec::new();

    for item in items {
        let in_stock = check_in_stock(&item.id, pool).await?;
        
        responses.push(PublishedProductResponse {
            id: item.id.to_string(),
            name: item.name,
            sku: item.sku,
            description: item.description,
            price: item.price,
            in_stock,
            image_url: item.image_url,
        });
    }

    Ok(Json(ApiResponse::ok(responses)))
}

// Helper function to check if product is in stock
async fn check_in_stock(item_id: &Uuid, pool: &State<DbPool>) -> Result<bool> {
    let result: Option<(i32,)> = sqlx::query_as(
        "SELECT quantity_in_stock FROM stock WHERE inventory_item_id = $1"
    )
    .bind(item_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    Ok(result.map(|(qty,)| qty > 0).unwrap_or(false))
}

// Serve product images
#[rocket::get("/images/<filename>")]
pub async fn serve_product_image(filename: String) -> Result<NamedFile> {
    use std::path::Path;

    // Prevent directory traversal attacks
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        return Err(ApiError::BadRequest("Invalid filename".to_string()));
    }

    let file_path = Path::new("uploads/products").join(&filename);

    match NamedFile::open(&file_path).await {
        Ok(f) => Ok(f),
        Err(_) => Err(ApiError::NotFound),
    }
}
