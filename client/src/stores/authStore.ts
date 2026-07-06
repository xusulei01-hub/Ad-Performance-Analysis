import { create } from 'zustand'
import { request } from '../services/api/client'

interface UserInfo {
  id: number
  username: string
  role: string
  permittedChannels: string | null
}

interface AuthState {
  token: string | null
  user: UserInfo | null
  isAdmin: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: null,
  isAdmin: false,
  isLoading: true,

  login: async (username: string, password: string) => {
    const data = await request.post('/v1/auth/login', { username, password })
    const { token, user } = (data as any).data || data
    localStorage.setItem('token', token)
    set({
      token,
      user,
      isAdmin: user.role === 'admin',
      isLoading: false,
    })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null, isAdmin: false, isLoading: false })
  },

  loadFromStorage: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ isLoading: false })
      return
    }
    try {
      // 请求 me 需要一个 token header，复用 request 会自动带上 localStorage token
      const user = await request.get('/v1/user/me')
      set({
        token,
        user: user as unknown as UserInfo,
        isAdmin: (user as any).role === 'admin',
        isLoading: false,
      })
    } catch {
      localStorage.removeItem('token')
      set({ token: null, user: null, isAdmin: false, isLoading: false })
    }
  },
}))
