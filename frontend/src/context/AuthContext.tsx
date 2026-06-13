import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../api/auth'
import type { UserResponse } from '../types'

interface AuthState {
  user: UserResponse | null
  token: string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  loginWithToken: (user: UserResponse, token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isLoading: true,
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setState(s => ({ ...s, isLoading: false })); return }
    authApi
      .getProfile()
      .then(res => setState({ user: res.data ?? null, token, isLoading: false }))
      .catch(() => {
        localStorage.removeItem('token')
        setState({ user: null, token: null, isLoading: false })
      })
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    if (!res.data) throw new Error('Login failed')
    localStorage.setItem('token', res.data.token)
    setState({ user: res.data.user, token: res.data.token, isLoading: false })
  }

  const loginWithToken = (user: UserResponse, token: string) => {
    localStorage.setItem('token', token)
    setState({ user, token, isLoading: false })
  }

  const logout = () => {
    localStorage.removeItem('token')
    setState({ user: null, token: null, isLoading: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
