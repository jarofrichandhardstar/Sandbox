import { client } from './client'
import type {
  ApiResponse,
  AdminInventoryResponse,
  AdminStockResponse,
  ShippingCoverageResponse,
  SiteContentResponse,
  CreateInventoryRequest,
  UpdateInventoryRequest,
  UpdateStockRequest,
  CreateShippingCoverageRequest,
  UpdateShippingCoverageRequest,
  UpdateContentRequest,
  CreateContentRequest,
} from '../types'

export const adminApi = {
  // Inventory
  listInventory: () =>
    client.get<ApiResponse<AdminInventoryResponse[]>>('/admin/inventory'),

  getInventory: (id: string) =>
    client.get<ApiResponse<AdminInventoryResponse>>(`/admin/inventory/${id}`),

  createInventory: (req: CreateInventoryRequest) =>
    client.post<ApiResponse<AdminInventoryResponse>>('/admin/inventory', req),

  updateInventory: (id: string, req: UpdateInventoryRequest) =>
    client.put<ApiResponse<AdminInventoryResponse>>(`/admin/inventory/${id}`, req),

  deleteInventory: (id: string) =>
    client.delete<ApiResponse<{ deleted: boolean }>>(`/admin/inventory/${id}`),

  togglePublish: (id: string) =>
    client.post<ApiResponse<AdminInventoryResponse>>(`/admin/inventory/${id}/publish`, {}),

  // Stock
  createStock: (inventoryId: string, req: UpdateStockRequest) =>
    client.post<ApiResponse<AdminStockResponse>>(`/admin/stock/${inventoryId}`, req),

  updateStock: (stockId: string, req: UpdateStockRequest) =>
    client.put<ApiResponse<AdminStockResponse>>(`/admin/stock/${stockId}`, req),

  // Images
  uploadImage: (inventoryId: string, file: File) =>
    client.postBinary<ApiResponse<{ id: string; image_url: string; message: string }>>(
      `/admin/inventory/${inventoryId}/image`,
      file,
    ),

  deleteImage: (inventoryId: string) =>
    client.delete<ApiResponse<{ deleted: boolean }>>(`/admin/inventory/${inventoryId}/image`),

  // Shipping coverage
  listShipping: () =>
    client.get<ApiResponse<ShippingCoverageResponse[]>>('/admin/shipping/coverage'),

  createShipping: (req: CreateShippingCoverageRequest) =>
    client.post<ApiResponse<ShippingCoverageResponse>>('/admin/shipping/coverage', req),

  updateShipping: (id: string, req: UpdateShippingCoverageRequest) =>
    client.put<ApiResponse<ShippingCoverageResponse>>(`/admin/shipping/coverage/${id}`, req),

  deleteShipping: (id: string) =>
    client.delete<ApiResponse<{ deleted: boolean }>>(`/admin/shipping/coverage/${id}`),

  // Site content (CMS)
  listContent: () =>
    client.get<ApiResponse<SiteContentResponse[]>>('/admin/content'),

  updateContent: (key: string, req: UpdateContentRequest) =>
    client.put<ApiResponse<SiteContentResponse>>(`/admin/content/${key}`, req),

  createContent: (req: CreateContentRequest) =>
    client.post<ApiResponse<SiteContentResponse>>('/admin/content', req),

  deleteContent: (key: string) =>
    client.delete<ApiResponse<{ deleted: boolean }>>(`/admin/content/${key}`),

  uploadContentImage: (key: string, file: File) =>
    client.postBinary<ApiResponse<SiteContentResponse>>(`/admin/content/${key}/image`, file),
}
