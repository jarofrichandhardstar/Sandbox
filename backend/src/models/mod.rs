use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// User role enumeration
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
pub enum UserRole {
    #[serde(rename = "admin")]
    Admin,
    #[serde(rename = "user")]
    User,
}

impl std::str::FromStr for UserRole {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "admin" => Ok(UserRole::Admin),
            "user" => Ok(UserRole::User),
            _ => Err(format!("Unknown role: {}", s)),
        }
    }
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserRole::Admin => write!(f, "admin"),
            UserRole::User => write!(f, "user"),
        }
    }
}

// User model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub password_hash: String,
    pub role: String, // "admin" or "user"
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Registration request DTO
#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub username: String,
    pub password: String,
}

// Login request DTO
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

// Auth response DTO
#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub user: UserResponse,
    pub token: String,
}

// User response DTO
#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub username: String,
    pub created_at: String,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        UserResponse {
            id: user.id.to_string(),
            email: user.email,
            username: user.username,
            created_at: user.created_at.to_rfc3339(),
        }
    }
}

// Generic API response wrapper
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        ApiResponse {
            success: true,
            data: Some(data),
            message: "Success".to_string(),
        }
    }

    pub fn ok_with_message(data: T, message: &str) -> Self {
        ApiResponse {
            success: true,
            data: Some(data),
            message: message.to_string(),
        }
    }
}

// Health check response
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub timestamp: String,
}

// ============================================
// INVENTORY AND STOCK MODELS
// ============================================

// Inventory item model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InventoryItem {
    pub id: Uuid,
    pub name: String,
    pub sku: String,
    pub description: String,
    pub price: f64,
    pub cost: f64,
    pub is_published: bool,
    pub image_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Create inventory item request
#[derive(Debug, Deserialize)]
pub struct CreateInventoryRequest {
    pub name: String,
    pub sku: String,
    pub description: String,
    pub price: f64,
    pub cost: f64,
}

// Update inventory item request
#[derive(Debug, Deserialize)]
pub struct UpdateInventoryRequest {
    pub name: Option<String>,
    pub sku: Option<String>,
    pub description: Option<String>,
    pub price: Option<f64>,
    pub cost: Option<f64>,
}

// Stock tracking model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Stock {
    pub id: Uuid,
    pub inventory_item_id: Uuid,
    pub quantity_in_stock: i32,
    pub reorder_level: i32,
    pub reorder_quantity: i32,
    pub warehouse_location: String,
    pub updated_at: DateTime<Utc>,
}

// Update stock request
#[derive(Debug, Deserialize)]
pub struct UpdateStockRequest {
    pub quantity_in_stock: Option<i32>,
    pub reorder_level: Option<i32>,
    pub reorder_quantity: Option<i32>,
    pub warehouse_location: Option<String>,
}

// Inventory item response (published for users)
#[derive(Debug, Serialize, Deserialize)]
pub struct PublishedProductResponse {
    pub id: String,
    pub name: String,
    pub sku: String,
    pub description: String,
    pub price: f64,
    pub in_stock: bool,
    pub image_url: Option<String>,
}

// Admin inventory response (detailed)
#[derive(Debug, Serialize, Deserialize)]
pub struct AdminInventoryResponse {
    pub id: String,
    pub name: String,
    pub sku: String,
    pub description: String,
    pub price: f64,
    pub cost: f64,
    pub is_published: bool,
    pub image_url: Option<String>,
    pub stock: Option<AdminStockResponse>,
    pub profit_margin: f64,
    pub created_at: String,
    pub updated_at: String,
}

// Admin stock response
#[derive(Debug, Serialize, Deserialize)]
pub struct AdminStockResponse {
    pub id: String,
    pub quantity_in_stock: i32,
    pub reorder_level: i32,
    pub reorder_quantity: i32,
    pub warehouse_location: String,
    pub needs_reorder: bool,
}

impl From<InventoryItem> for AdminInventoryResponse {
    fn from(item: InventoryItem) -> Self {
        let profit_margin = if item.cost > 0.0 {
            ((item.price - item.cost) / item.price * 100.0).round()
        } else {
            0.0
        };

        AdminInventoryResponse {
            id: item.id.to_string(),
            name: item.name,
            sku: item.sku,
            description: item.description,
            price: item.price,
            cost: item.cost,
            is_published: item.is_published,
            image_url: item.image_url,
            stock: None,
            profit_margin,
            created_at: item.created_at.to_rfc3339(),
            updated_at: item.updated_at.to_rfc3339(),
        }
    }
}

impl From<Stock> for AdminStockResponse {
    fn from(stock: Stock) -> Self {
        let needs_reorder = stock.quantity_in_stock <= stock.reorder_level;

        AdminStockResponse {
            id: stock.id.to_string(),
            quantity_in_stock: stock.quantity_in_stock,
            reorder_level: stock.reorder_level,
            reorder_quantity: stock.reorder_quantity,
            warehouse_location: stock.warehouse_location,
            needs_reorder,
        }
    }
}

// ============================================
// IMAGE MANAGEMENT MODELS
// ============================================

// Image upload response
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageUploadResponse {
    pub id: String,
    pub image_url: String,
    pub message: String,
}

// Image metadata response
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub filename: String,
    pub url: String,
    pub size_bytes: u64,
    pub mime_type: String,
}

// ============================================
// CART, ORDER, AND SHIPPING MODELS
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CartItem {
    pub id: Uuid,
    pub user_id: Uuid,
    pub inventory_item_id: Uuid,
    pub quantity: i32,
    pub added_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CartItemRequest {
    pub inventory_item_id: String,
    pub quantity: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCartItemRequest {
    pub quantity: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CartItemResponse {
    pub id: String,
    pub inventory_item_id: String,
    pub product_name: String,
    pub sku: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub line_total: f64,
    pub image_url: Option<String>,
    pub in_stock: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckoutRequest {
    pub shipping_address: String,
    pub shipping_city: String,
    pub shipping_postal_code: String,
    pub payment_method: String,
    pub payment_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ShippingCoverage {
    pub id: Uuid,
    pub region_name: String,
    pub city: String,
    pub postal_code: String,
    pub cost: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateShippingCoverageRequest {
    pub region_name: String,
    pub city: String,
    pub postal_code: String,
    pub cost: f64,
}

#[derive(Debug, Deserialize)]
pub struct UpdateShippingCoverageRequest {
    pub region_name: Option<String>,
    pub city: Option<String>,
    pub postal_code: Option<String>,
    pub cost: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ShippingCoverageResponse {
    pub id: String,
    pub region_name: String,
    pub city: String,
    pub postal_code: String,
    pub cost: f64,
}

impl From<ShippingCoverage> for ShippingCoverageResponse {
    fn from(coverage: ShippingCoverage) -> Self {
        ShippingCoverageResponse {
            id: coverage.id.to_string(),
            region_name: coverage.region_name,
            city: coverage.city,
            postal_code: coverage.postal_code,
            cost: coverage.cost,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct OrderItem {
    pub id: Uuid,
    pub order_id: Uuid,
    pub inventory_item_id: Uuid,
    pub item_name: String,
    pub sku: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub line_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Order {
    pub id: Uuid,
    pub user_id: Uuid,
    pub total_amount: f64,
    pub shipping_cost: f64,
    pub total_paid: f64,
    pub status: String,
    pub shipping_address: String,
    pub shipping_city: String,
    pub shipping_postal_code: String,
    pub shipping_region: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderItemResponse {
    pub inventory_item_id: String,
    pub item_name: String,
    pub sku: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub line_total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderResponse {
    pub order_id: String,
    pub status: String,
    pub total_amount: f64,
    pub shipping_cost: f64,
    pub total_paid: f64,
    pub shipping_address: String,
    pub shipping_city: String,
    pub shipping_postal_code: String,
    pub shipping_region: String,
    pub items: Vec<OrderItemResponse>,
    pub created_at: String,
}

impl From<OrderItem> for OrderItemResponse {
    fn from(item: OrderItem) -> Self {
        OrderItemResponse {
            inventory_item_id: item.inventory_item_id.to_string(),
            item_name: item.item_name,
            sku: item.sku,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
        }
    }
}

impl From<Order> for OrderResponse {
    fn from(order: Order) -> Self {
        OrderResponse {
            order_id: order.id.to_string(),
            status: order.status,
            total_amount: order.total_amount,
            shipping_cost: order.shipping_cost,
            total_paid: order.total_paid,
            shipping_address: order.shipping_address,
            shipping_city: order.shipping_city,
            shipping_postal_code: order.shipping_postal_code,
            shipping_region: order.shipping_region,
            items: vec![],
            created_at: order.created_at.to_rfc3339(),
        }
    }
}

// ============================================
// SITE CONTENT (CMS) MODELS
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SiteContent {
    pub key: String,
    pub value: String,
    pub label: String,
    pub description: Option<String>,
    pub content_type: String,
    pub section: String,
    pub is_public: bool,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SiteContentResponse {
    pub key: String,
    pub value: String,
    pub label: String,
    pub description: Option<String>,
    pub content_type: String,
    pub section: String,
    pub updated_at: String,
}

impl From<SiteContent> for SiteContentResponse {
    fn from(c: SiteContent) -> Self {
        SiteContentResponse {
            key: c.key,
            value: c.value,
            label: c.label,
            description: c.description,
            content_type: c.content_type,
            section: c.section,
            updated_at: c.updated_at.to_rfc3339(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateContentRequest {
    pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateContentRequest {
    pub key: String,
    pub value: String,
    pub label: String,
    pub description: Option<String>,
    pub content_type: String,
    pub section: String,
    pub is_public: bool,
}
