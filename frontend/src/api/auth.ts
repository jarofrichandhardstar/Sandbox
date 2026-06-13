import { client } from './client'
import type { ApiResponse, AuthResponse, RegisterResponse, UserResponse } from '../types'

export const authApi = {
  register: (email: string, username: string, password: string) =>
    client.post<ApiResponse<RegisterResponse>>('/auth/register', { email, username, password }),

  verifyEmail: (email: string, otp: string) =>
    client.post<ApiResponse<AuthResponse>>('/auth/verify-email', { email, otp }),

  resendOtp: (email: string) =>
    client.post<ApiResponse<null>>('/auth/resend-otp', { email }),

  login: (email: string, password: string) =>
    client.post<ApiResponse<AuthResponse>>('/auth/login', { email, password }),

  getProfile: () =>
    client.get<ApiResponse<UserResponse>>('/profile'),

  forgotPassword: (email: string) =>
    client.post<ApiResponse<null>>('/auth/forgot-password', { email }),

  resetPassword: (token: string, new_password: string) =>
    client.post<ApiResponse<null>>('/auth/reset-password', { token, new_password }),
}
