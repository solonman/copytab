import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../authService'
import { supabase } from '../supabaseClient'

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}))

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentUser', () => {
    it('应该返回当前用户', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any)

      const result = await authService.getCurrentUser()
      expect(result).toEqual({ data: { user: mockUser }, error: null })
      expect(supabase.auth.getUser).toHaveBeenCalled()
    })

    it('应该处理错误', async () => {
      const mockError = new Error('Network error')
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: mockError,
      } as any)

      const result = await authService.getCurrentUser()
      expect(result).toEqual({ data: { user: null }, error: mockError })
    })
  })

  describe('signInWithEmail', () => {
    it('应该成功登录', async () => {
      const mockSession = { access_token: 'token123' }
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: '123' }, session: mockSession },
        error: null,
      } as any)

      const result = await authService.signInWithEmail('test@example.com', 'password')
      expect(result).toEqual({ user: { id: '123' }, session: mockSession })
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      })
    })

    it('应该处理登录错误', async () => {
      const mockError = new Error('Invalid credentials')
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      } as any)

      await expect(authService.signInWithEmail('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials')
    })
  })

  describe('signUp', () => {
    it('应该成功注册', async () => {
      const mockUser = { id: '123', email: 'new@example.com' }
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      } as any)

      const result = await authService.signUp('new@example.com', 'password')
      expect(result).toEqual({ user: mockUser, session: null })
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password',
        options: {
          data: undefined
        }
      })
    })
  })

  describe('signOut', () => {
    it('应该成功登出', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as any)

      await authService.signOut()
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })
  })
})