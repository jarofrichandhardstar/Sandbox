import { client } from './client'
import type { ApiResponse, AuthResponse, UserResponse } from '../types'

export const authApi = {
  register: (email: string, username: string, password: string) =>
    client.post<ApiResponse<AuthResponse>>('/auth/register', { email, username, password }),

  login: (email: string, password: string) =>
    client.post<ApiResponse<AuthResponse>>('/auth/login', { email, password }),

  getProfile: () => client.get<ApiResponse<UserResponse>>('/profile'),
}
