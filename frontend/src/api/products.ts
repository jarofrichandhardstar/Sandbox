import { client } from './client'
import type { ApiResponse, PublishedProduct } from '../types'

export const productsApi = {
  list: () => client.get<ApiResponse<PublishedProduct[]>>('/products'),

  get: (id: string) => client.get<ApiResponse<PublishedProduct>>(`/products/${id}`),

  search: (query: string) =>
    client.get<ApiResponse<PublishedProduct[]>>(`/products/search?query=${encodeURIComponent(query)}`),
}
