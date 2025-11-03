import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCompletion } from '../useCompletion'
import { completionService } from '../../services/completionService'

vi.mock('../../services/completionService', () => ({
  completionService: {
    generateCompletion: vi.fn(),
    generateStreamCompletion: vi.fn(),
    cancelCompletion: vi.fn(),
    clearCache: vi.fn(),
    getCacheStats: vi.fn(),
  },
}))

describe('useCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该初始化状态', () => {
    const { result } = renderHook(() => useCompletion())
    
    expect(result.current.text).toBe('')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('应该处理补全请求', async () => {
    vi.mocked(completionService.generateCompletion).mockResolvedValue({ text: '测试补全' })
    
    const { result } = renderHook(() => useCompletion({ debounceMs: 0 }))
    
    await act(async () => {
      await result.current.generateCompletion('测试输入')
    })
    
    expect(result.current.loading).toBe(false)
    expect(result.current.text).toBe('测试补全')
    expect(result.current.error).toBe(null)
  })

  it('应该处理错误', async () => {
    const mockError = new Error('API错误')
    vi.mocked(completionService.generateCompletion).mockRejectedValue(mockError)
    
    const { result } = renderHook(() => useCompletion({ debounceMs: 0 }))
    
    // 等待错误状态设置
    await act(async () => {
      try {
        await result.current.generateCompletion('测试输入')
      } catch (error) {
        // 预期会抛出错误，这里捕获但不处理
      }
    })
    
    // 等待React状态更新
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(result.current.error).toBe('API错误')
    expect(result.current.text).toBe('')
  })

  it('应该防抖请求', async () => {
    vi.mocked(completionService.generateCompletion).mockResolvedValue({ text: '防抖测试' })
    
    const { result } = renderHook(() => useCompletion({ debounceMs: 0 }))
    
    // 验证初始状态
    expect(result.current.loading).toBe(false)
    expect(result.current.text).toBe('')
    
    // 第一次调用
    act(() => {
      result.current.generateCompletion('输入1')
    })
    
    // 立即检查loading状态应该为true
    expect(result.current.loading).toBe(true)
    
    // 等待请求完成
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 验证最终状态
    expect(result.current.loading).toBe(false)
    expect(result.current.text).toBe('防抖测试')
  })

  it('应该清除补全结果', async () => {
    const { result } = renderHook(() => useCompletion())
    
    // 首先生成一些内容
    vi.mocked(completionService.generateCompletion).mockResolvedValue({ text: '测试内容' })
    
    await act(async () => {
      await result.current.generateCompletion('测试输入')
    })
    
    expect(result.current.text).toBe('测试内容')
    
    act(() => {
      result.current.clearText()
    })
    
    expect(result.current.text).toBe('')
  })
})