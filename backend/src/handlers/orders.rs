use rocket::{serde::json::Json, State};
use uuid::Uuid;
use chrono::Utc;

use crate::{
    db::DbPool,
    errors::{ApiError, Result},
    middleware::AuthGuard,
    models::*,
};

#[derive(Debug, sqlx::FromRow)]
struct CartItemRow {
    id: Uuid,
    inventory_item_id: Uuid,
    quantity: i32,
    name: String,
    sku: String,
    price: f64,
    image_url: Option<String>,
    quantity_in_stock: Option<i32>,
}

#[derive(Debug, sqlx::FromRow)]
struct ShippingCoverageRow {
    id: Uuid,
    region_name: String,
    city: String,
    postal_code: String,
    cost: f64,
}

#[rocket::get("/cart")]
pub async fn list_cart(
    guard: AuthGuard,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<Vec<CartItemResponse>>>> {
    let user_id = Uuid::parse_str(&guard.claims.sub).map_err(|_| ApiError::Unauthorized)?;

    let items: Vec<CartItemRow> = sqlx::query_as(
        "SELECT c.id, c.inventory_item_id, c.quantity, i.name, i.sku, i.price, i.image_url, s.quantity_in_stock
         FROM cart_items c
         JOIN inventory_items i ON c.inventory_item_id = i.id
         LEFT JOIN stock s ON i.id = s.inventory_item_id
         WHERE c.user_id = $1"
    )
    .bind(user_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let response_items: Vec<CartItemResponse> = items.into_iter().map(|item| {
        let line_total = item.price * item.quantity as f64;
        CartItemResponse {
            id: item.id.to_string(),
            inventory_item_id: item.inventory_item_id.to_string(),
            product_name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            unit_price: item.price,
            line_total,
            image_url: item.image_url,
            in_stock: item.quantity_in_stock.unwrap_or(0) >= item.quantity,
        }
    }).collect();

    Ok(Json(ApiResponse::ok(response_items)))
}

#[rocket::post("/cart", format = "json", data = "<req>")]
pub async fn add_to_cart(
    guard: AuthGuard,
    req: Json<CartItemRequest>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<CartItemResponse>>> {
    let user_id = Uuid::parse_str(&guard.claims.sub).map_err(|_| ApiError::Unauthorized)?;

    if req.quantity <= 0 {
        return Err(ApiError::ValidationError("Quantity must be greater than zero".to_string()));
    }

    let inventory_item_id = Uuid::parse_str(&req.inventory_item_id)
        .map_err(|_| ApiError::BadRequest("Invalid inventory item ID format".to_string()))?;

    let item: InventoryItem = sqlx::query_as(
        "SELECT id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at
         FROM inventory_items WHERE id = $1 AND is_published = true"
    )
    .bind(inventory_item_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?
    .ok_or(ApiError::NotFound)?;

    let quantity_in_stock: Option<(i32,)> = sqlx::query_as(
        "SELECT quantity_in_stock FROM stock WHERE inventory_item_id = $1"
    )
    .bind(inventory_item_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let in_stock = quantity_in_stock.map(|(qty,)| qty).unwrap_or(0);
    if req.quantity > in_stock {
        return Err(ApiError::BadRequest(format!(
            "Not enough stock available. Requested {}, available {}.",
            req.quantity, in_stock
        )));
    }

    let existing: Option<CartItem> = sqlx::query_as(
        "SELECT id, user_id, inventory_item_id, quantity, added_at FROM cart_items
         WHERE user_id = $1 AND inventory_item_id = $2"
    )
    .bind(user_id)
    .bind(inventory_item_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let cart_item = if let Some(existing) = existing {
        let new_quantity = existing.quantity + req.quantity;
        let updated: CartItem = sqlx::query_as(
            "UPDATE cart_items SET quantity = $1, added_at = $2 WHERE id = $3
             RETURNING id, user_id, inventory_item_id, quantity, added_at"
        )
        .bind(new_quantity)
        .bind(Utc::now())
        .bind(existing.id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            ApiError::Database(e.to_string())
        })?;
        updated
    } else {
        let cart_id = Uuid::new_v4();
        sqlx::query_as(
            "INSERT INTO cart_items (id, user_id, inventory_item_id, quantity, added_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, user_id, inventory_item_id, quantity, added_at"
        )
        .bind(cart_id)
        .bind(user_id)
        .bind(inventory_item_id)
        .bind(req.quantity)
        .bind(Utc::now())
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            ApiError::Database(e.to_string())
        })?
    };

    let response = CartItemResponse {
        id: cart_item.id.to_string(),
        inventory_item_id: cart_item.inventory_item_id.to_string(),
        product_name: item.name,
        sku: item.sku,
        quantity: cart_item.quantity,
        unit_price: item.price,
        line_total: item.price * cart_item.quantity as f64,
        image_url: item.image_url,
        in_stock: cart_item.quantity <= in_stock,
    };

    Ok(Json(ApiResponse::ok_with_message(
        response,
        "Cart item added successfully",
    )))
}

#[rocket::put("/cart/<id>", format = "json", data = "<req>")]
pub async fn update_cart_item(
    guard: AuthGuard,
    id: String,
    req: Json<UpdateCartItemRequest>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<CartItemResponse>>> {
    let user_id = Uuid::parse_str(&guard.claims.sub).map_err(|_| ApiError::Unauthorized)?;

    if req.quantity <= 0 {
        return Err(ApiError::ValidationError("Quantity must be greater than zero".to_string()));
    }

    let cart_id = Uuid::parse_str(&id).map_err(|_| ApiError::BadRequest("Invalid cart item ID format".to_string()))?;

    let cart_item: CartItem = sqlx::query_as(
        "SELECT id, user_id, inventory_item_id, quantity, added_at FROM cart_items WHERE id = $1 AND user_id = $2"
    )
    .bind(cart_id)
    .bind(user_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?
    .ok_or(ApiError::NotFound)?;

    let quantity_in_stock: Option<(i32,)> = sqlx::query_as(
        "SELECT quantity_in_stock FROM stock WHERE inventory_item_id = $1"
    )
    .bind(cart_item.inventory_item_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let in_stock = quantity_in_stock.map(|(qty,)| qty).unwrap_or(0);
    if req.quantity > in_stock {
        return Err(ApiError::BadRequest(format!(
            "Not enough stock available. Requested {}, available {}.",
            req.quantity, in_stock
        )));
    }

    let updated: CartItem = sqlx::query_as(
        "UPDATE cart_items SET quantity = $1, added_at = $2 WHERE id = $3
         RETURNING id, user_id, inventory_item_id, quantity, added_at"
    )
    .bind(req.quantity)
    .bind(Utc::now())
    .bind(cart_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let item: InventoryItem = sqlx::query_as(
        "SELECT id, name, sku, description, price, cost, is_published, image_url, created_at, updated_at
         FROM inventory_items WHERE id = $1"
    )
    .bind(cart_item.inventory_item_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let response = CartItemResponse {
        id: updated.id.to_string(),
        inventory_item_id: updated.inventory_item_id.to_string(),
        product_name: item.name,
        sku: item.sku,
        quantity: updated.quantity,
        unit_price: item.price,
        line_total: item.price * updated.quantity as f64,
        image_url: item.image_url,
        in_stock: updated.quantity <= in_stock,
    };

    Ok(Json(ApiResponse::ok_with_message(
        response,
        "Cart item updated successfully",
    )))
}

#[rocket::delete("/cart/<id>")]
pub async fn delete_cart_item(
    guard: AuthGuard,
    id: String,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<serde_json::Value>>> {
    let user_id = Uuid::parse_str(&guard.claims.sub).map_err(|_| ApiError::Unauthorized)?;
    let cart_id = Uuid::parse_str(&id).map_err(|_| ApiError::BadRequest("Invalid cart item ID format".to_string()))?;

    let deleted = sqlx::query(
        "DELETE FROM cart_items WHERE id = $1 AND user_id = $2"
    )
    .bind(cart_id)
    .bind(user_id)
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
        "Cart item removed successfully",
    )))
}

#[rocket::post("/checkout", format = "json", data = "<req>")]
pub async fn checkout(
    guard: AuthGuard,
    req: Json<CheckoutRequest>,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<OrderResponse>>> {
    let user_id = Uuid::parse_str(&guard.claims.sub).map_err(|_| ApiError::Unauthorized)?;

    if req.shipping_address.trim().is_empty()
        || req.shipping_city.trim().is_empty()
        || req.shipping_postal_code.trim().is_empty()
        || req.payment_method.trim().is_empty()
        || req.payment_amount < 0.0 {
        return Err(ApiError::ValidationError("Shipping address, city, postal code, payment method, and a valid payment amount are required".to_string()));
    }

    let cart_items: Vec<CartItemRow> = sqlx::query_as(
        "SELECT c.id, c.inventory_item_id, c.quantity, i.name, i.sku, i.price, i.image_url, s.quantity_in_stock
         FROM cart_items c
         JOIN inventory_items i ON c.inventory_item_id = i.id
         LEFT JOIN stock s ON i.id = s.inventory_item_id
         WHERE c.user_id = $1"
    )
    .bind(user_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    if cart_items.is_empty() {
        return Err(ApiError::BadRequest("Cart is empty".to_string()));
    }

    let shipping_coverage: Option<ShippingCoverageRow> = sqlx::query_as(
        "SELECT id, region_name, city, postal_code, cost FROM shipping_coverage
         WHERE LOWER(city) = LOWER($1) AND postal_code = $2 LIMIT 1"
    )
    .bind(&req.shipping_city)
    .bind(&req.shipping_postal_code)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let shipping_coverage = shipping_coverage.ok_or(ApiError::BadRequest(
        "No shipping coverage found for the provided city and postal code".to_string(),
    ))?;

    let subtotal = cart_items.iter().map(|item| item.price * item.quantity as f64).sum::<f64>();
    let total = subtotal + shipping_coverage.cost;

    if req.payment_amount < total {
        return Err(ApiError::BadRequest(format!(
            "Payment amount is insufficient. Total due is {}.",
            total
        )));
    }

    let mut tx = pool.inner().begin().await.map_err(|e| {
        tracing::error!("Failed to begin transaction: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let order_id = Uuid::new_v4();
    let now = Utc::now();

    let order: Order = sqlx::query_as(
        "INSERT INTO orders (id, user_id, total_amount, shipping_cost, total_paid, status, shipping_address, shipping_city, shipping_postal_code, shipping_region, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, user_id, total_amount, shipping_cost, total_paid, status, shipping_address, shipping_city, shipping_postal_code, shipping_region, created_at, updated_at"
    )
    .bind(order_id)
    .bind(user_id)
    .bind(subtotal)
    .bind(shipping_coverage.cost)
    .bind(total)
    .bind("paid")
    .bind(&req.shipping_address)
    .bind(&req.shipping_city)
    .bind(&req.shipping_postal_code)
    .bind(&shipping_coverage.region_name)
    .bind(now)
    .bind(now)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let mut response_items: Vec<OrderItemResponse> = Vec::new();

    for item in cart_items.iter() {
        let line_total = item.price * item.quantity as f64;
        sqlx::query(
            "INSERT INTO order_items (id, order_id, inventory_item_id, item_name, sku, quantity, unit_price, line_total)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
        )
        .bind(Uuid::new_v4())
        .bind(order_id)
        .bind(item.inventory_item_id)
        .bind(&item.name)
        .bind(&item.sku)
        .bind(item.quantity)
        .bind(item.price)
        .bind(line_total)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            ApiError::Database(e.to_string())
        })?;

        let updated_stock = sqlx::query(
            "UPDATE stock SET quantity_in_stock = quantity_in_stock - $1
             WHERE inventory_item_id = $2 AND quantity_in_stock >= $1"
        )
        .bind(item.quantity)
        .bind(item.inventory_item_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            ApiError::Database(e.to_string())
        })?;

        if updated_stock.rows_affected() == 0 {
            return Err(ApiError::BadRequest(format!(
                "Inventory item '{}' is no longer available in sufficient quantity.",
                item.name
            )));
        }

        response_items.push(OrderItemResponse {
            inventory_item_id: item.inventory_item_id.to_string(),
            item_name: item.name.clone(),
            sku: item.sku.clone(),
            quantity: item.quantity,
            unit_price: item.price,
            line_total,
        });
    }

    sqlx::query("DELETE FROM cart_items WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            ApiError::Database(e.to_string())
        })?;

    tx.commit().await.map_err(|e| {
        tracing::error!("Transaction commit failed: {}", e);
        ApiError::Database(e.to_string())
    })?;

    let response = OrderResponse {
        order_id: order.id.to_string(),
        status: order.status,
        total_amount: order.total_amount,
        shipping_cost: order.shipping_cost,
        total_paid: order.total_paid,
        shipping_address: order.shipping_address,
        shipping_city: order.shipping_city,
        shipping_postal_code: order.shipping_postal_code,
        shipping_region: order.shipping_region,
        items: response_items,
        created_at: order.created_at.to_rfc3339(),
    };

    Ok(Json(ApiResponse::ok_with_message(
        response,
        "Checkout complete and order created successfully",
    )))
}

#[rocket::get("/shipping/estimate?<city>&<postal_code>")]
pub async fn estimate_shipping(
    city: String,
    postal_code: String,
    pool: &State<DbPool>,
) -> Result<Json<ApiResponse<ShippingCoverageResponse>>> {
    if city.trim().is_empty() || postal_code.trim().is_empty() {
        return Err(ApiError::ValidationError("City and postal code are required".to_string()));
    }

    let coverage: ShippingCoverageRow = sqlx::query_as(
        "SELECT id, region_name, city, postal_code, cost FROM shipping_coverage
         WHERE LOWER(city) = LOWER($1) AND postal_code = $2 LIMIT 1"
    )
    .bind(&city)
    .bind(&postal_code)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        ApiError::Database(e.to_string())
    })?
    .ok_or(ApiError::NotFound)?;

    Ok(Json(ApiResponse::ok(ShippingCoverageResponse {
        id: coverage.id.to_string(),
        region_name: coverage.region_name,
        city: coverage.city,
        postal_code: coverage.postal_code,
        cost: coverage.cost,
    })))
}
