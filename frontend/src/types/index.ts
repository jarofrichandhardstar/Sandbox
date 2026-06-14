export interface ApiResponse<T> {
  success: boolean
  data: T | null
  message: string
}

export interface UserResponse {
  id: string
  email: string
  username: string
  role: string
  created_at: string
}

export interface AuthResponse {
  user: UserResponse
  token: string
}

export interface RegisterResponse {
  email: string
}

export interface PublishedProduct {
  id: string
  name: string
  sku: string
  description: string
  price: number
  in_stock: boolean
  image_url: string | null
}

export interface AdminStockResponse {
  id: string
  quantity_in_stock: number
  reorder_level: number
  reorder_quantity: number
  warehouse_location: string
  needs_reorder: boolean
}

export interface AdminInventoryResponse {
  id: string
  name: string
  sku: string
  description: string
  price: number
  cost: number
  is_published: boolean
  image_url: string | null
  stock: AdminStockResponse | null
  profit_margin: number
  created_at: string
  updated_at: string
}

export interface CartItemResponse {
  id: string
  inventory_item_id: string
  product_name: string
  sku: string
  quantity: number
  unit_price: number
  line_total: number
  image_url: string | null
  in_stock: boolean
}

export interface CheckoutRequest {
  shipping_address: string
  shipping_city: string
  shipping_postal_code: string
}

export interface AdminOrderListItem {
  id: string
  user_email: string
  username: string
  total_amount: number
  shipping_cost: number
  total_paid: number
  status: string
  shipping_city: string
  shipping_region: string
  item_count: number
  created_at: string
}

export interface UpdateOrderStatusRequest {
  status: string
}

export interface OrderItemResponse {
  inventory_item_id: string
  item_name: string
  sku: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface OrderResponse {
  order_id: string
  status: string
  total_amount: number
  shipping_cost: number
  total_paid: number
  shipping_address: string
  shipping_city: string
  shipping_postal_code: string
  shipping_region: string
  items: OrderItemResponse[]
  created_at: string
}

export interface ShippingCoverageResponse {
  id: string
  region_name: string
  city: string
  postal_code: string
  cost: number
}

export interface CreateInventoryRequest {
  name: string
  sku: string
  description: string
  price: number
  cost: number
}

export interface UpdateInventoryRequest {
  name?: string
  sku?: string
  description?: string
  price?: number
  cost?: number
}

export interface UpdateStockRequest {
  quantity_in_stock?: number
  reorder_level?: number
  reorder_quantity?: number
  warehouse_location?: string
}

export interface CreateShippingCoverageRequest {
  region_name: string
  city: string
  postal_code: string
  cost: number
}

export interface UpdateShippingCoverageRequest {
  region_name?: string
  city?: string
  postal_code?: string
  cost?: number
}

// ── CMS / Site Content ────────────────────────────────────────────────────────

export type ContentType = 'text' | 'richtext' | 'url' | 'boolean' | 'color' | 'image'

export interface SiteContentResponse {
  key: string
  value: string
  label: string
  description: string | null
  content_type: ContentType
  section: string
  updated_at: string
}

export interface UpdateContentRequest {
  value: string
}

export interface CreateContentRequest {
  key: string
  value: string
  label: string
  description: string | null
  content_type: ContentType
  section: string
  is_public: boolean
}

/** Flat map of key → value, used by components that just need to read content */
export type ContentMap = Record<string, string>
