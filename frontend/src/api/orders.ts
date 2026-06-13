import { client } from './client'
import type { ApiResponse, CheckoutRequest, OrderResponse, ShippingCoverageResponse } from '../types'

export const ordersApi = {
  checkout: (req: CheckoutRequest) =>
    client.post<ApiResponse<OrderResponse>>('/checkout', req),

  estimateShipping: (city: string, postal_code: string) =>
    client.get<ApiResponse<ShippingCoverageResponse>>(
      `/shipping/estimate?city=${encodeURIComponent(city)}&postal_code=${encodeURIComponent(postal_code)}`,
    ),
}
