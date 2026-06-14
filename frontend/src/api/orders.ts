import { client } from './client'
import type { ApiResponse, AdminOrderListItem, CheckoutRequest, OrderResponse, ShippingCoverageResponse, UpdateOrderStatusRequest } from '../types'

export const ordersApi = {
  checkout: (req: CheckoutRequest) =>
    client.post<ApiResponse<OrderResponse>>('/checkout', req),

  estimateShipping: (city: string, postal_code: string) =>
    client.get<ApiResponse<ShippingCoverageResponse>>(
      `/shipping/estimate?city=${encodeURIComponent(city)}&postal_code=${encodeURIComponent(postal_code)}`,
    ),
}

export const adminOrdersApi = {
  list: () =>
    client.get<ApiResponse<AdminOrderListItem[]>>('/admin/orders'),

  get: (id: string) =>
    client.get<ApiResponse<OrderResponse>>(`/admin/orders/${id}`),

  updateStatus: (id: string, req: UpdateOrderStatusRequest) =>
    client.put<ApiResponse<{ status: string }>>(`/admin/orders/${id}/status`, req),
}
