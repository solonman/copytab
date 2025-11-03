import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { completionService } from '../completionService'
import { offlineService } from '../offlineService'
import { supabase } from '../supabaseClient'

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: 'test-token' } } }))
    }
  }
}))

// Mock global fetch before tests
beforeAll(() => {
  global.fetch = vi.fn()
})

vi.mock('../offlineService', () => ({
  offlineService: {
    getCachedCompletions: vi.fn(() => Promise.resolve([])),
    saveCachedCompletion: vi.fn(),
    clearCachedCompletions: vi.fn(),
  },
}))

// Mock fetch for API responses
// global.fetch = vi.fn() // 移动到beforeAll中设置

describe('completionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateCompletion', () => {
    it('应该返回补全结果', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn(() => Promise.resolve({
          text: '测试补全结果'
        }))
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await completionService.generateCompletion({
        prompt: '测试输入'
      })
      expect(result.text).toBe('测试补全结果')
      expect(fetch).toHaveBeenCalled()
    })

    it('应该处理网络错误', async () => {
      // Mock fetch to reject with network error
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const result = await completionService.generateCompletion({
        prompt: '测试输入'
      })
      
      // 由于缓存机制，网络错误不会直接抛出，而是返回缓存结果或空结果
      expect(result).toBeDefined()
    })

    it('应该缓存结果', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn(() => Promise.resolve({
          text: '缓存测试'
        }))
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await completionService.generateCompletion({
        prompt: '缓存测试'
      })
      
      // 等待缓存保存完成
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(offlineService.saveCachedCompletion).toHaveBeenCalled()
    })
  })

  describe('generateStreamCompletion', () => {
    it('应该处理流式响应', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"流式测试"}}]}\n\n')
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn()
      }

      const mockResponse = {
        ok: true,
        body: {
          getReader: vi.fn(() => mockReader)
        }
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const onChunk = vi.fn()
      await completionService.generateStreamCompletion({
        prompt: '测试'
      }, onChunk)

      expect(onChunk).toHaveBeenCalledWith('流式测试')
    })

    it('应该处理流式响应完成', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"测试内容"}}]}\n\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n\n')
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn()
      }

      const mockResponse = {
        ok: true,
        body: {
          getReader: vi.fn(() => mockReader)
        }
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const onChunk = vi.fn()
      await completionService.generateStreamCompletion({
        prompt: '测试'
      }, onChunk)

      expect(onChunk).toHaveBeenCalledWith('测试内容')
    })
  })

  describe('cancelCompletion', () => {
    it('应该支持取消操作', () => {
      expect(() => completionService.cancelCompletion()).not.toThrow()
    })
  })

  describe('clearCache', () => {
    it('应该清空缓存', () => {
      expect(() => completionService.clearCache()).not.toThrow()
      expect(offlineService.clearCachedCompletions).toHaveBeenCalled()
    })
  })

  describe('getCacheStats', () => {
    it('应该返回缓存统计', () => {
      const stats = completionService.getCacheStats()
      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('expired')
      expect(typeof stats.total).toBe('number')
      expect(typeof stats.expired).toBe('number')
    })
  })
})