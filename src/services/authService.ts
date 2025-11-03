import { supabase } from './supabaseClient'

// 微信认证相关的服务
export const wechatAuthService = {
  // 生成微信登录二维码
  async generateWechatQRCode() {
    try {
      const { data, error } = await supabase
        .functions
        .invoke('generate-wechat-qrcode', {
          method: 'POST'
        })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('生成微信二维码失败:', error)
      throw error
    }
  },

  // 检查微信登录状态
  async checkWechatLoginStatus(sceneId: string) {
    try {
      const { data, error } = await supabase
        .functions
        .invoke('check-wechat-login-status', {
          method: 'POST',
          body: { scene_id: sceneId }
        })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('检查微信登录状态失败:', error)
      throw error
    }
  },

  // 处理微信登录回调
  async handleWechatLogin(code: string) {
    try {
      const { data, error } = await supabase
        .functions
        .invoke('handle-wechat-login', {
          method: 'POST',
          body: { code }
        })
      
      if (error) throw error
      
      // 如果登录成功，设置用户会话
      if (data.session) {
        await supabase.auth.setSession(data.session)
      }
      
      return data
    } catch (error) {
      console.error('处理微信登录失败:', error)
      throw error
    }
  },

  // 绑定微信账号到现有用户
  async bindWechatAccount(unionId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_wechat_bindings')
        .insert({
          user_id: userId,
          union_id: unionId,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('绑定微信账号失败:', error)
      throw error
    }
  },

  // 解绑微信账号
  async unbindWechatAccount(userId: string) {
    try {
      const { error } = await supabase
        .from('user_wechat_bindings')
        .delete()
        .eq('user_id', userId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('解绑微信账号失败:', error)
      throw error
    }
  },

  // 获取用户的微信绑定信息
  async getWechatBinding(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_wechat_bindings')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    } catch (error) {
      console.error('获取微信绑定信息失败:', error)
      throw error
    }
  }
}

// 用户认证相关的服务
export const authService = {
  // 用户登录（邮箱/密码）
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },

  // 用户注册
  async signUp(email: string, password: string, metadata?: Record<string, any>) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    if (error) throw error
    return data
  },

  // 发送密码重置邮件
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    
    if (error) throw error
    return data
  },

  // 更新密码
  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) throw error
    return data
  },

  // 获取当前用户
  getCurrentUser() {
    return supabase.auth.getUser()
  },

  // 获取当前会话
  getCurrentSession() {
    return supabase.auth.getSession()
  },

  // 用户登出
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return true
  },

  // 监听认证状态变化
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// 用户资料相关的服务
export const userProfileService = {
  // 获取用户完整资料
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        user_configs(*),
        user_wechat_bindings(*)
      `)
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  // 更新用户资料
  async updateUserProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 获取用户统计信息
  async getUserStats(userId: string) {
    try {
      // 获取项目数量
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null)

      // 获取文档数量
      const { count: documentCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null)

      // 获取标准信息数量
      const { count: standardInfoCount } = await supabase
        .from('standard_info')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null)

      return {
        projectCount: projectCount || 0,
        documentCount: documentCount || 0,
        standardInfoCount: standardInfoCount || 0
      }
    } catch (error) {
      console.error('获取用户统计信息失败:', error)
      throw error
    }
  }
}

export default {
  wechatAuthService,
  authService,
  userProfileService
}