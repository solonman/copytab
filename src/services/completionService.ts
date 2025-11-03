import { supabase } from './supabaseClient'
import { offlineService } from './offlineService'

export interface CompletionRequest {
  prompt: string
  context?: string
  language?: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

export interface CompletionResponse {
  text: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface CompletionCache {
  id: string
  prompt: string
  context?: string
  response: string
  language?: string
  createdAt: Date
  expiresAt: Date
}

class CompletionService {
  private cache: Map<string, CompletionCache> = new Map()
  private pendingRequests: Map<string, Promise<CompletionResponse>> = new Map()
  private abortControllers: Map<string, AbortController> = new Map()

  constructor() {
    this.loadCacheFromStorage()
    this.setupCacheCleanup()
  }

  private async loadCacheFromStorage() {
    try {
      const cachedCompletions = await offlineService.getCachedCompletions() as unknown as CompletionCache[]
      cachedCompletions.forEach(item => {
        this.cache.set(item.id, item)
      })
    } catch (error) {
      console.warn('Failed to load completion cache:', error)
    }
  }

  private setupCacheCleanup() {
    // 每5分钟清理过期缓存
    setInterval(() => {
      this.cleanupExpiredCache()
    }, 5 * 60 * 1000)
  }

  private cleanupExpiredCache() {
    const now = new Date()
    for (const [key, cache] of this.cache.entries()) {
      if (cache.expiresAt <= now) {
        this.cache.delete(key)
      }
    }
  }

  private generateCacheKey(request: CompletionRequest): string {
    const keyData = {
      prompt: request.prompt.trim(),
      context: request.context?.trim(),
      language: request.language,
      maxTokens: request.maxTokens
    }
    try {
      return btoa(JSON.stringify(keyData))
    } catch {
      // 如果btoa失败，使用简单的哈希函数
      const str = JSON.stringify(keyData)
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // 转换为32位整数
      }
      return Math.abs(hash).toString(36)
    }
  }

  private async saveCacheToStorage(cache: CompletionCache) {
    try {
      await offlineService.saveCachedCompletion(cache)
    } catch (error) {
      console.warn('Failed to save completion cache:', error)
    }
  }

  private async getCachedCompletion(key: string): Promise<CompletionResponse | null> {
    const cache = this.cache.get(key)
    if (cache && cache.expiresAt > new Date()) {
      return {
        text: cache.response,
        usage: undefined
      }
    }
    return null
  }

  private async saveCompletionCache(key: string, request: CompletionRequest, response: CompletionResponse) {
    const cache: CompletionCache = {
      id: key,
      prompt: request.prompt,
      context: request.context,
      response: response.text,
      language: request.language,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时过期
    }
    
    this.cache.set(key, cache)
    await this.saveCacheToStorage(cache)
  }

  private async makeAPIRequest(request: CompletionRequest, signal?: AbortSignal): Promise<CompletionResponse> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('用户未登录')
    }

    const response = await fetch('/api/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        ...request,
        userId: user.id
      }),
      signal
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API请求失败: ${error}`)
    }

    const result = await response.json()
    return result
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const cacheKey = this.generateCacheKey(request)
    
    // 检查是否有相同请求正在进行
    const pendingRequest = this.pendingRequests.get(cacheKey)
    if (pendingRequest) {
      return pendingRequest
    }

    // 检查缓存
    const cachedResponse = await this.getCachedCompletion(cacheKey)
    if (cachedResponse) {
      return cachedResponse
    }

    // 创建新的请求
    const abortController = new AbortController()
    this.abortControllers.set(cacheKey, abortController)

    const requestPromise = this.makeAPIRequest(request, abortController.signal)
      .then(response => {
        // 保存到缓存
        this.saveCompletionCache(cacheKey, request, response)
        return response
      })
      .finally(() => {
        // 清理请求状态
        this.pendingRequests.delete(cacheKey)
        this.abortControllers.delete(cacheKey)
      })

    this.pendingRequests.set(cacheKey, requestPromise)
    return requestPromise
  }

  async generateStreamCompletion(request: CompletionRequest, onChunk: (chunk: string) => void): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('用户未登录')
    }

    const response = await fetch('/api/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        ...request,
        stream: true,
        userId: user.id
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API请求失败: ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let fullText = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            
            try {
              const parsed = JSON.parse(data)
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content
                fullText += content
                onChunk(content)
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 保存完整的流式响应到缓存
      const cacheKey = this.generateCacheKey(request)
      await this.saveCompletionCache(cacheKey, request, { text: fullText })
    } finally {
      reader.releaseLock()
    }
  }

  cancelCompletion(requestKey?: string): void {
    if (requestKey) {
      const controller = this.abortControllers.get(requestKey)
      if (controller) {
        controller.abort()
        this.abortControllers.delete(requestKey)
        this.pendingRequests.delete(requestKey)
      }
    } else {
      // 取消所有请求
      for (const controller of this.abortControllers.values()) {
        controller.abort()
      }
      this.abortControllers.clear()
      this.pendingRequests.clear()
    }
  }

  clearCache(): void {
    this.cache.clear()
    offlineService.clearCachedCompletions()
  }

  getCacheStats(): { total: number; expired: number } {
    const now = new Date()
    let expired = 0
    
    for (const cache of this.cache.values()) {
      if (cache.expiresAt <= now) {
        expired++
      }
    }

    return {
      total: this.cache.size,
      expired
    }
  }
}

export const completionService = new CompletionService()