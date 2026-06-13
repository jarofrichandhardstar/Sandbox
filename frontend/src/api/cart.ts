import { client } from './client'
import type { ApiResponse, CartItemResponse } from '../types'

export const cartApi = {
  list: () => client.get<ApiResponse<CartItemResponse[]>>('/cart'),

  add: (inventory_item_id: string, quantity: number) =>
    client.post<ApiResponse<CartItemResponse>>('/cart', { inventory_item_id, quantity }),

  update: (id: string, quantity: number) =>
    client.put<ApiResponse<CartItemResponse>>(`/cart/${id}`, { quantity }),

  remove: (id: string) =>
    client.delete<ApiResponse<{ deleted: boolean }>>(`/cart/${id}`),
}
