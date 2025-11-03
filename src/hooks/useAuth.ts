import React, { useState, useEffect, createContext, useContext } from 'react'
import { authService, wechatAuthService } from '../services/authService'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  generateWechatQRCode: () => Promise<any>
  checkWechatLoginStatus: (sceneId: string) => Promise<any>
  bindWechatAccount: (unionId: string) => Promise<void>
  unbindWechatAccount: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 初始化认证状态
  useEffect(() => {
    initializeAuth()
    
    // 监听认证状态变化
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const initializeAuth = async () => {
    try {
      const { data: { session } } = await authService.getCurrentSession()
      if (session?.user) {
        setUser(session.user)
      }
    } catch (error) {
      console.error('初始化认证失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      const result = await authService.signInWithEmail(email, password)
      if (result.user) {
        setUser(result.user)
      }
    } catch (error: any) {
      setError(error.message || '登录失败')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      setError(null)
      setLoading(true)
      const result = await authService.signUp(email, password, metadata)
      if (result.user) {
        setUser(result.user)
      }
    } catch (error: any) {
      setError(error.message || '注册失败')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      setLoading(true)
      await authService.signOut()
      setUser(null)
    } catch (error: any) {
      setError(error.message || '登出失败')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setError(null)
      setLoading(true)
      await authService.resetPassword(email)
    } catch (error: any) {
      setError(error.message || '重置密码失败')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      setError(null)
      setLoading(true)
      await authService.updatePassword(newPassword)
    } catch (error: any) {
      setError(error.message || '更新密码失败')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 微信扫码登录相关
  const generateWechatQRCode = async () => {
    try {
      setError(null)
      return await wechatAuthService.generateWechatQRCode()
    } catch (error: any) {
      setError(error.message || '生成微信二维码失败')
      throw error
    }
  }

  const checkWechatLoginStatus = async (sceneId: string) => {
    try {
      setError(null)
      const result = await wechatAuthService.checkWechatLoginStatus(sceneId)
      
      // 如果登录成功，更新用户状态
      if (result.success && result.user) {
        setUser(result.user)
      }
      
      return result
    } catch (error: any) {
      setError(error.message || '检查微信登录状态失败')
      throw error
    }
  }

  const bindWechatAccount = async (unionId: string) => {
    try {
      setError(null)
      if (!user) throw new Error('用户未登录')
      await wechatAuthService.bindWechatAccount(unionId, user.id)
    } catch (error: any) {
      setError(error.message || '绑定微信账号失败')
      throw error
    }
  }

  const unbindWechatAccount = async () => {
    try {
      setError(null)
      if (!user) throw new Error('用户未登录')
      await wechatAuthService.unbindWechatAccount(user.id)
    } catch (error: any) {
      setError(error.message || '解绑微信账号失败')
      throw error
    }
  }

  const refreshUser = async () => {
    try {
      const { data } = await authService.getCurrentUser()
      if (data.user) {
        setUser(data.user)
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error)
    }
  }

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    generateWechatQRCode,
    checkWechatLoginStatus,
    bindWechatAccount,
    unbindWechatAccount,
    refreshUser
  }

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内使用')
  }
  return context
}