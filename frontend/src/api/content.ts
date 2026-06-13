import { client } from './client'
import type { ApiResponse, SiteContentResponse } from '../types'

export const contentApi = {
  /** Public — returns only is_public=true entries */
  list: () => client.get<ApiResponse<SiteContentResponse[]>>('/content'),
}
