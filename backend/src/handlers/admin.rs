use rocket::{serde::json::Json, State};
use uuid::Uuid;
use chrono::Utc;

use crate::{
    db::DbPool,
    errors::{ApiError, Result},
    models::*,
    middleware::AdminGuard,
    utils::images,
};

// Create inventory item
#[rocket::post("/inventory", format = "json", data = "<req>")]
pub async fn create_inventory(
    _guard: AdminGuard,
    req: Json<CreateInventoryRequest>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<AdminInventoryResponse>>> {
    // Validate input
    if req.name.is_empty() || req.sku.is_empty() {
        return Err(ApiError::ValidationError(
            "Name and SKU are required".to_string(),
        ));
    }

    if req.price < 0.0 || req.cost < 0.0 {
        return Err(ApiError::ValidationError(
            "Price and cost must be non-negative".to_string(),
        ));
    }

    // Check if SKU already exists
    let existing: Option<(String,)> = sqlx::query_as("SELECT id FROM inventory_items WHERE sku = $1")
        .bind(&req.sku)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            ApiError::Database(e.to_string())
        })?;

    if existing.is_some() {
        return Err(ApiError::BadRequest("SKU already exists".to_string()));
    }

    let item_id = Uuid::new_v4();
    let now = Utc::now();

    let item: InventoryItem = sqlx::query_as(
        "INSERT INTO inventory_items (id, name, sku, description, price, cost, is_published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)
         RETURNING id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at"
    )
    .bind(item_id)
    .bind(&req.name)
    .bind(&req.sku)
    .bind(&req.description)
    .bind(req.price)
    .bind(req.cost)
    .bind(now)
    .bind(now)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    tracing::info!("Inventory item created: {} ({})", item.name, item.id);

    // Auto-create a stock record so the item is immediately manageable
    let stock_id = Uuid::new_v4();
    let stock: Stock = sqlx::query_as(
        "INSERT INTO stock (id, inventory_item_id, quantity_in_stock, reorder_level, reorder_quantity, warehouse_location, updated_at)
         VALUES ($1, $2, 0, 10, 50, 'Default Warehouse', $3)
         RETURNING id, inventory_item_id, quantity_in_stock, reorder_level, reorder_quantity, warehouse_location, updated_at"
    )
    .bind(stock_id)
    .bind(item_id)
    .bind(now)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error creating auto-stock: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let mut response: AdminInventoryResponse = item.into();
    response.stock = Some(stock.into());

    Ok(Json(ApiResponse::ok_with_message(
        response,
        "Inventory item created successfully",
    )))
}

// Get all inventory items (admin view)
#[rocket::get("/inventory")]
pub async fn list_inventory(
    _guard: AdminGuard,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<Vec<AdminInventoryResponse>>>> {
    let items: Vec<InventoryItem> = sqlx::query_as(
        "SELECT id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at
         FROM inventory_items ORDER BY created_at DESC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let mut responses: Vec<AdminInventoryResponse> = items.into_iter().map(|i| i.into()).collect();

    // Fetch stock for each item
    for response in &mut responses {
        let stock: Option<Stock> = sqlx::query_as(
            "SELECT id, inventory_item_id, quantity_in_stock, reorder_level, reorder_quantity, warehouse_location, updated_at 
             FROM stock WHERE inventory_item_id = $1"
        )
        .bind(Uuid::parse_str(&response.id).unwrap())
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            ApiError::Database(e.to_string())
        })?;

        if let Some(s) = stock {
            response.stock = Some(s.into());
        }
    }

    Ok(Json(ApiResponse::ok(responses)))
}

// Get single inventory item
#[rocket::get("/inventory/<id>")]
pub async fn get_inventory(
    _guard: AdminGuard,
    id: String,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<AdminInventoryResponse>>> {
    let item_id = Uuid::parse_str(&id).map_err(|_| ApiError::BadRequest("Invalid ID format".to_string()))?;

    let item: InventoryItem = sqlx::query_as(
        "SELECT id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at
         FROM inventory_items WHERE id = $1"
    )
    .bind(item_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?
    .ok_or(ApiError::NotFound)?;

    let mut response: AdminInventoryResponse = item.into();

    let stock: Option<Stock> = sqlx::query_as(
        "SELECT id, inventory_item_id, quantity_in_stock, reorder_level, reorder_quantity, warehouse_location, updated_at 
         FROM stock WHERE inventory_item_id = $1"
    )
    .bind(item_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    if let Some(s) = stock {
        response.stock = Some(s.into());
    }

    Ok(Json(ApiResponse::ok(response)))
}

// Update inventory item
#[rocket::put("/inventory/<id>", format = "json", data = "<req>")]
pub async fn update_inventory(
    _guard: AdminGuard,
    id: String,
    req: Json<UpdateInventoryRequest>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<AdminInventoryResponse>>> {
    let item_id = Uuid::parse_str(&id).map_err(|_| ApiError::BadRequest("Invalid ID format".to_string()))?;

    // Fetch current item
    let mut item: InventoryItem = sqlx::query_as(
        "SELECT id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at
         FROM inventory_items WHERE id = $1"
    )
    .bind(item_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?
    .ok_or(ApiError::NotFound)?;

    // Update fields
    if let Some(name) = &req.name {
        item.name = name.clone();
    }
    if let Some(sku) = &req.sku {
        item.sku = sku.clone();
    }
    if let Some(description) = &req.description {
        item.description = description.clone();
    }
    if let Some(price) = req.price {
        item.price = price;
    }
    if let Some(cost) = req.cost {
        item.cost = cost;
    }

    let now = Utc::now();

    let updated: InventoryItem = sqlx::query_as(
        "UPDATE inventory_items SET name = $1, sku = $2, description = $3, price = $4, cost = $5, updated_at = $6
         WHERE id = $7
         RETURNING id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at"
    )
    .bind(&item.name)
    .bind(&item.sku)
    .bind(&item.description)
    .bind(item.price)
    .bind(item.cost)
    .bind(now)
    .bind(item_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    tracing::info!("Inventory item updated: {} ({})", updated.name, updated.id);

    Ok(Json(ApiResponse::ok_with_message(
        updated.into(),
        "Inventory item updated successfully",
    )))
}

// Delete inventory item
#[rocket::delete("/inventory/<id>")]
pub async fn delete_inventory(
    _guard: AdminGuard,
    id: String,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<serde_json::Value>>> {
    let item_id = Uuid::parse_str(&id).map_err(|_| ApiError::BadRequest("Invalid ID format".to_string()))?;

    // Verify item exists
    let _: (String,) = sqlx::query_as("SELECT id FROM inventory_items WHERE id = $1")
        .bind(item_id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            ApiError::Database(e.to_string())
        })?
        .ok_or(ApiError::NotFound)?;

    // Delete associated stock records
    sqlx::query("DELETE FROM stock WHERE inventory_item_id = $1")
        .bind(item_id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            ApiError::Database(e.to_string())
        })?;

    // Delete inventory item
    sqlx::query("DELETE FROM inventory_items WHERE id = $1")
        .bind(item_id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            ApiError::Database(e.to_string())
        })?;

    tracing::info!("Inventory item deleted: {}", item_id);

    Ok(Json(ApiResponse::ok_with_message(
        serde_json::json!({"deleted": true}),
        "Inventory item deleted successfully",
    )))
}

// Publish/unpublish inventory item
#[rocket::post("/inventory/<id>/publish")]
pub async fn publish_inventory(
    _guard: AdminGuard,
    id: String,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<AdminInventoryResponse>>> {
    let item_id = Uuid::parse_str(&id).map_err(|_| ApiError::BadRequest("Invalid ID format".to_string()))?;

    let item: InventoryItem = sqlx::query_as(
        "SELECT id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at
         FROM inventory_items WHERE id = $1"
    )
    .bind(item_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?
    .ok_or(ApiError::NotFound)?;

    let new_published_state = !item.is_published;
    let now = Utc::now();

    let updated: InventoryItem = sqlx::query_as(
        "UPDATE inventory_items SET is_published = $1, updated_at = $2
         WHERE id = $3
         RETURNING id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at"
    )
    .bind(new_published_state)
    .bind(now)
    .bind(item_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    tracing::info!(
        "Inventory item published state changed to: {} ({})",
        new_published_state,
        updated.id
    );

    Ok(Json(ApiResponse::ok_with_message(
        updated.into(),
        if new_published_state {
            "Item published successfully"
        } else {
            "Item unpublished successfully"
        },
    )))
}

// Update stock
#[rocket::put("/stock/<id>", format = "json", data = "<req>")]
pub async fn update_stock(
    _guard: AdminGuard,
    id: String,
    req: Json<UpdateStockRequest>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<AdminStockResponse>>> {
    let stock_id = Uuid::parse_str(&id).map_err(|_| ApiError::BadRequest("Invalid ID format".to_string()))?;

    // Fetch current stock
    let mut stock: Stock = sqlx::query_as(
        "SELECT id, inventory_item_id, quantity_in_stock, reorder_level, reorder_quantity, warehouse_location, updated_at 
         FROM stock WHERE id = $1"
    )
    .bind(stock_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?
    .ok_or(ApiError::NotFound)?;

    // Update fields
    if let Some(qty) = req.quantity_in_stock {
        stock.quantity_in_stock = qty;
    }
    if let Some(level) = req.reorder_level {
        stock.reorder_level = level;
    }
    if let Some(qty) = req.reorder_quantity {
        stock.reorder_quantity = qty;
    }
    if let Some(location) = &req.warehouse_location {
        stock.warehouse_location = location.clone();
    }

    let now = Utc::now();

    let updated: Stock = sqlx::query_as(
        "UPDATE stock SET quantity_in_stock = $1, reorder_level = $2, reorder_quantity = $3, warehouse_location = $4, updated_at = $5
         WHERE id = $6
         RETURNING id, inventory_item_id, quantity_in_stock, reorder_level, reorder_quantity, warehouse_location, updated_at"
    )
    .bind(stock.quantity_in_stock)
    .bind(stock.reorder_level)
    .bind(stock.reorder_quantity)
    .bind(&stock.warehouse_location)
    .bind(now)
    .bind(stock_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    tracing::info!("Stock updated: {} (qty: {})", updated.id, updated.quantity_in_stock);

    Ok(Json(ApiResponse::ok_with_message(
        updated.into(),
        "Stock updated successfully",
    )))
}

// Initialize stock for an inventory item
#[rocket::post("/stock/<inventory_id>", format = "json", data = "<req>")]
pub async fn create_stock(
    _guard: AdminGuard,
    inventory_id: String,
    req: Json<UpdateStockRequest>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<AdminStockResponse>>> {
    let item_id = Uuid::parse_str(&inventory_id).map_err(|_| ApiError::BadRequest("Invalid ID format".to_string()))?;

    // Verify inventory item exists
    let _: (String,) = sqlx::query_as("SELECT id FROM inventory_items WHERE id = $1")
        .bind(item_id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            ApiError::Database(e.to_string())
        })?
        .ok_or(ApiError::NotFound)?;

    // Check if stock already exists
    let existing: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM stock WHERE inventory_item_id = $1"
    )
    .bind(item_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    if existing.is_some() {
        return Err(ApiError::BadRequest("Stock already exists for this item".to_string()));
    }

    let stock_id = Uuid::new_v4();
    let now = Utc::now();

    let stock: Stock = sqlx::query_as(
        "INSERT INTO stock (id, inventory_item_id, quantity_in_stock, reorder_level, reorder_quantity, warehouse_location, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, inventory_item_id, quantity_in_stock, reorder_level, reorder_quantity, warehouse_location, updated_at"
    )
    .bind(stock_id)
    .bind(item_id)
    .bind(req.quantity_in_stock.unwrap_or(0))
    .bind(req.reorder_level.unwrap_or(10))
    .bind(req.reorder_quantity.unwrap_or(50))
    .bind(req.warehouse_location.as_ref().unwrap_or(&"Default Warehouse".to_string()))
    .bind(now)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    tracing::info!("Stock created for inventory item: {}", item_id);

    Ok(Json(ApiResponse::ok_with_message(
        stock.into(),
        "Stock initialized successfully",
    )))
}

// Upload product image
#[rocket::post("/inventory/<id>/image", format = "application/octet-stream", data = "<data>")]
pub async fn upload_product_image(
    _guard: AdminGuard,
    id: String,
    data: Vec<u8>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<ImageUploadResponse>>> {
    let item_id = Uuid::parse_str(&id).map_err(|_| ApiError::BadRequest("Invalid ID format".to_string()))?;

    // Verify inventory item exists
    let _: (String,) = sqlx::query_as("SELECT id FROM inventory_items WHERE id = $1")
        .bind(item_id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            ApiError::Database(e.to_string())
        })?
        .ok_or(ApiError::NotFound)?;

    // Validate file size
    images::validate_file_size(data.len())?;

    // Generate filename
    let filename = images::generate_filename("product.jpg");

    // Save image
    let image_url = images::save_upload(&filename, &data)?;

    // Update inventory item with image URL
    let now = Utc::now();
    sqlx::query(
        "UPDATE inventory_items SET image_url = $1, updated_at = $2 WHERE id = $3"
    )
    .bind(&image_url)
    .bind(now)
    .bind(item_id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    tracing::info!("Product image uploaded: {} ({})", item_id, filename);

    Ok(Json(ApiResponse::ok_with_message(
        ImageUploadResponse {
            id: item_id.to_string(),
            image_url,
            message: "Image uploaded successfully".to_string(),
        },
        "Image uploaded successfully",
    )))
}

// Delete product image
#[rocket::delete("/inventory/<id>/image")]
pub async fn delete_product_image(
    _guard: AdminGuard,
    id: String,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<serde_json::Value>>> {
    let item_id = Uuid::parse_str(&id).map_err(|_| ApiError::BadRequest("Invalid ID format".to_string()))?;

    // Fetch inventory item
    let item: InventoryItem = sqlx::query_as(
        "SELECT id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at 
         FROM inventory_items WHERE id = $1"
    )
    .bind(item_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?
    .ok_or(ApiError::NotFound)?;

    // Delete image file if exists
    if let Some(image_url) = &item.image_url {
        if let Some(filename) = images::extract_filename_from_url(image_url) {
            images::delete_upload(&filename)?;
        }
    }

    // Update inventory item to remove image URL
    let now = Utc::now();
    sqlx::query(
        "UPDATE inventory_items SET image_url = NULL, updated_at = $1 WHERE id = $2"
    )
    .bind(now)
    .bind(item_id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    tracing::info!("Product image deleted: {}", item_id);

    Ok(Json(ApiResponse::ok_with_message(
        serde_json::json!({"deleted": true}),
        "Image deleted successfully",
    )))
}

// Create shipping coverage entry
#[rocket::post("/shipping/coverage", format = "json", data = "<req>")]
pub async fn create_shipping_coverage(
    _guard: AdminGuard,
    req: Json<CreateShippingCoverageRequest>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<ShippingCoverageResponse>>> {
    if req.region_name.trim().is_empty()
        || req.city.trim().is_empty()
        || req.postal_code.trim().is_empty()
        || req.cost < 0.0 {
        return Err(ApiError::ValidationError(
            "Region name, city, postal code, and a non-negative cost are required".to_string(),
        ));
    }

    let coverage_id = Uuid::new_v4();
    let now = Utc::now();

    let coverage: ShippingCoverage = sqlx::query_as(
        "INSERT INTO shipping_coverage (id, region_name, city, postal_code, cost, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, region_name, city, postal_code, cost, created_at, updated_at"
    )
    .bind(coverage_id)
    .bind(&req.region_name)
    .bind(&req.city)
    .bind(&req.postal_code)
    .bind(req.cost)
    .bind(now)
    .bind(now)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    Ok(Json(ApiResponse::ok_with_message(
        ShippingCoverageResponse::from(coverage),
        "Shipping coverage entry created successfully",
    )))
}

#[rocket::get("/shipping/coverage")]
pub async fn list_shipping_coverage(
    _guard: AdminGuard,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<Vec<ShippingCoverageResponse>>>> {
    let coverage: Vec<ShippingCoverage> = sqlx::query_as(
        "SELECT id, region_name, city, postal_code, cost, created_at, updated_at FROM shipping_coverage ORDER BY created_at DESC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let response: Vec<ShippingCoverageResponse> = coverage.into_iter().map(ShippingCoverageResponse::from).collect();
    Ok(Json(ApiResponse::ok(response)))
}

#[rocket::put("/shipping/coverage/<id>", format = "json", data = "<req>")]
pub async fn update_shipping_coverage(
    _guard: AdminGuard,
    id: String,
    req: Json<UpdateShippingCoverageRequest>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<ShippingCoverageResponse>>> {
    let coverage_id = Uuid::parse_str(&id).map_err(|_| ApiError::BadRequest("Invalid ID format".to_string()))?;

    let existing: ShippingCoverage = sqlx::query_as(
        "SELECT id, region_name, city, postal_code, cost, created_at, updated_at FROM shipping_coverage WHERE id = $1"
    )
    .bind(coverage_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?
    .ok_or(ApiError::NotFound)?;

    let region_name = req.region_name.clone().unwrap_or(existing.region_name);
    let city = req.city.clone().unwrap_or(existing.city);
    let postal_code = req.postal_code.clone().unwrap_or(existing.postal_code);
    let cost = req.cost.unwrap_or(existing.cost);
    let now = Utc::now();

    let updated: ShippingCoverage = sqlx::query_as(
        "UPDATE shipping_coverage SET region_name = $1, city = $2, postal_code = $3, cost = $4, updated_at = $5
         WHERE id = $6
         RETURNING id, region_name, city, postal_code, cost, created_at, updated_at"
    )
    .bind(&region_name)
    .bind(&city)
    .bind(&postal_code)
    .bind(cost)
    .bind(now)
    .bind(coverage_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    Ok(Json(ApiResponse::ok_with_message(
        ShippingCoverageResponse::from(updated),
        "Shipping coverage updated successfully",
    )))
}

#[rocket::delete("/shipping/coverage/<id>")]
pub async fn delete_shipping_coverage(
    _guard: AdminGuard,
    id: String,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<serde_json::Value>>> {
    let coverage_id = Uuid::parse_str(&id).map_err(|_| ApiError::BadRequest("Invalid ID format".to_string()))?;

    let deleted = sqlx::query(
        "DELETE FROM shipping_coverage WHERE id = $1"
    )
    .bind(coverage_id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    if deleted.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }

    Ok(Json(ApiResponse::ok_with_message(
        serde_json::json!({"deleted": true}),
        "Shipping coverage deleted successfully",
    )))
}

