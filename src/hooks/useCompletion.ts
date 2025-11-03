import { useState, useCallback, useRef, useEffect } from 'react'
import { completionService, CompletionRequest, CompletionResponse } from '../services/completionService'

export interface UseCompletionOptions {
  maxTokens?: number
  temperature?: number
  language?: string
  stream?: boolean
  debounceMs?: number
  cache?: boolean
}

export interface CompletionState {
  text: string
  loading: boolean
  error: string | null
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export function useCompletion(options: UseCompletionOptions = {}) {
  const [state, setState] = useState<CompletionState>({
    text: '',
    loading: false,
    error: null
  })

  const [requestKey, setRequestKey] = useState<string>('')
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const abortControllerRef = useRef<AbortController | undefined>(undefined)

  const {
    maxTokens = 1000,
    temperature = 0.7,
    language,
    stream = false,
    debounceMs = 300
  } = options

  // 清理函数
  const cleanup = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (requestKey) {
      completionService.cancelCompletion(requestKey)
    } else {
      completionService.cancelCompletion()
    }
  }, [requestKey])

  // 组件卸载时清理
  useEffect(() => {
    return cleanup
  }, [cleanup])

  const generateCompletion = useCallback(async (
    prompt: string,
    context?: string,
    onStream?: (chunk: string) => void
  ) => {
    // 清理之前的请求
    cleanup()

    const request: CompletionRequest = {
      prompt,
      context,
      language,
      maxTokens,
      temperature,
      stream: stream && !!onStream
    }

    // 生成请求key用于取消和缓存
    let key = ''
    try {
      key = btoa(JSON.stringify({ prompt: prompt.trim(), context: context?.trim(), language }))
    } catch {
      // 如果btoa失败，使用简单的哈希函数
      const str = JSON.stringify({ prompt: prompt.trim(), context: context?.trim(), language })
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // 转换为32位整数
      }
      key = hash.toString(36)
    }
    setRequestKey(key)

    // 防抖处理
    if (debounceMs > 0) {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      return new Promise<CompletionResponse>((resolve, reject) => {
        debounceTimerRef.current = setTimeout(async () => {
          try {
            if (stream && onStream) {
              setState(prev => ({ ...prev, text: '', loading: true, error: null }))
              
              let fullText = ''
              await completionService.generateStreamCompletion(request, (chunk) => {
                fullText += chunk
                setState(prev => ({ ...prev, text: fullText }))
                onStream(chunk)
              })
              
              const result: CompletionResponse = { text: fullText }
              setState(prev => ({ ...prev, loading: false }))
              resolve(result)
            } else {
              const result = await completionService.generateCompletion(request)
              setState({
                text: result.text,
                loading: false,
                error: null,
                usage: result.usage
              })
              resolve(result)
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '生成失败'
            setState(prev => ({ ...prev, loading: false, error: errorMessage }))
            reject(error)
          }
        }, debounceMs)
      })
    } else {
      // 无防抖，直接执行
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      try {
        if (stream && onStream) {
          setState(prev => ({ ...prev, text: '' }))
          
          let fullText = ''
          await completionService.generateStreamCompletion(request, (chunk) => {
            fullText += chunk
            setState(prev => ({ ...prev, text: fullText }))
            onStream(chunk)
          })
          
          const result: CompletionResponse = { text: fullText }
          setState(prev => ({ ...prev, loading: false }))
          return result
        } else {
          const result = await completionService.generateCompletion(request)
          setState({
            text: result.text,
            loading: false,
            error: null,
            usage: result.usage
          })
          return result
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '生成失败'
        setState(prev => ({ ...prev, loading: false, error: errorMessage }))
        throw error
      }
    }
  }, [cleanup, debounceMs, language, maxTokens, stream, temperature])

  const cancelCompletion = useCallback(() => {
    cleanup()
    setState(prev => ({ ...prev, loading: false }))
  }, [cleanup])

  const clearText = useCallback(() => {
    setState(prev => ({ ...prev, text: '', error: null }))
  }, [])

  const retry = useCallback(async (prompt: string, context?: string, onStream?: (chunk: string) => void) => {
    setState(prev => ({ ...prev, error: null }))
    return generateCompletion(prompt, context, onStream)
  }, [generateCompletion])

  return {
    ...state,
    generateCompletion,
    cancelCompletion,
    clearText,
    retry
  }
}

// 简化版本的补全Hook，用于快速生成
export function useQuickCompletion(
  prompt: string,
  options: UseCompletionOptions = {}
) {
  const { generateCompletion, ...state } = useCompletion(options)
  const [hasGenerated, setHasGenerated] = useState(false)

  const generate = useCallback(async (customPrompt?: string, context?: string) => {
    const finalPrompt = customPrompt || prompt
    if (!finalPrompt.trim()) return

    setHasGenerated(true)
    return generateCompletion(finalPrompt, context)
  }, [generateCompletion, prompt])

  // 自动生成功能（可选）
  useEffect(() => {
    if (prompt.trim() && !hasGenerated && options.debounceMs === 0) {
      generate()
    }
  }, [prompt, generate, hasGenerated, options.debounceMs])

  return {
    ...state,
    generate,
    hasGenerated
  }
}

// 流式补全Hook
export function useStreamCompletion(
  options: UseCompletionOptions = {}
) {
  const [streamText, setStreamText] = useState('')
  const { generateCompletion, ...state } = useCompletion({ ...options, stream: true })

  const generateStream = useCallback(async (prompt: string, context?: string) => {
    setStreamText('')
    
    return generateCompletion(prompt, context, (chunk) => {
      setStreamText(prev => prev + chunk)
    })
  }, [generateCompletion])

  const clearStream = useCallback(() => {
    setStreamText('')
  }, [])

  return {
    ...state,
    streamText,
    generateStream,
    clearStream
  }
}