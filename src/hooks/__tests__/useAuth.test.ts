import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { useAuth, AuthProvider } from '../useAuth'
import { authService } from '../../services/authService'

vi.mock('../../services/authService', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}))

describe('useAuth', () => {
  it('应该初始化加载状态', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue({ data: { user: null }, error: null } as any)
    vi.mocked(authService.onAuthStateChange).mockReturnValue({ data: { subscription: { id: 'test-sub', callback: vi.fn(), unsubscribe: vi.fn() } }, error: null } as any)

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => React.createElement(AuthProvider, null, children)
    })
    
    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(result.current.user).toBe(null)
  })

  it('应该处理用户认证状态', async () => {
    const mockUser = { id: '123', email: 'test@example.com' }
    vi.mocked(authService.getCurrentUser).mockResolvedValue({ data: { user: mockUser }, error: null } as any)
    vi.mocked(authService.onAuthStateChange).mockImplementation((callback) => {
      // 模拟异步调用回调
      setTimeout(() => callback('SIGNED_IN', { user: mockUser }), 0)
      return { data: { subscription: { id: 'test-sub', callback: vi.fn(), unsubscribe: vi.fn() } }, error: null } as any
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => React.createElement(AuthProvider, null, children)
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.user).toEqual(mockUser)
    })
  })

  it('应该清理订阅', () => {
    const mockUnsubscribe = vi.fn()
    vi.mocked(authService.getCurrentUser).mockResolvedValue({ data: { user: null }, error: null } as any)
    vi.mocked(authService.onAuthStateChange).mockReturnValue({ data: { subscription: { id: 'test-sub', callback: vi.fn(), unsubscribe: mockUnsubscribe } }, error: null } as any)

    const { unmount } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => React.createElement(AuthProvider, null, children)
    })
    
    unmount()
    
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})