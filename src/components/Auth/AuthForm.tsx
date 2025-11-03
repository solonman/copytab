import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Loader2, Mail, Lock, UserPlus, QrCode } from 'lucide-react'

interface LoginFormProps {
  onLoginSuccess?: () => void
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { signIn, signUp, loading, error } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setFormError('密码不匹配')
      return
    }

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password)
      } else {
        await signUp(formData.email, formData.password)
      }
      onLoginSuccess?.()
    } catch {
      // 错误已经在useAuth中处理
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          {isLogin ? '登录 CopyTab' : '注册 CopyTab'}
        </CardTitle>
        <CardDescription>
          {isLogin ? '使用邮箱和密码登录' : '创建新账户'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(error || formError) && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <AlertDescription>{error || formError}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">邮箱地址</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="输入密码"
                value={formData.password}
                onChange={handleInputChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="再次输入密码"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                处理中...
              </>
            ) : (
              isLogin ? '登录' : '注册'
            )}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
            >
              {isLogin ? (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  没有账户？立即注册
                </>
              ) : (
                '已有账户？立即登录'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

interface WechatLoginProps {
  onLoginSuccess?: () => void
}

export function WechatLogin({ onLoginSuccess }: WechatLoginProps) {
  const { generateWechatQRCode, checkWechatLoginStatus, loading, error } = useAuth()
  const [qrCodeData, setQrCodeData] = useState<any>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)

  useEffect(() => {
    generateQRCode()
  }, [])

  const generateQRCode = async () => {
    try {
      const data = await generateWechatQRCode()
      setQrCodeData(data)
      startStatusCheck(data.scene_id)
    } catch (err) {
      console.error('生成二维码失败:', err)
    }
  }

  const startStatusCheck = (sceneId: string) => {
    setCheckingStatus(true)
    const interval = setInterval(async () => {
      try {
        const result = await checkWechatLoginStatus(sceneId)
        if (result.success && result.user) {
          clearInterval(interval)
          setCheckingStatus(false)
          onLoginSuccess?.()
        }
      } catch (err) {
        console.error('检查登录状态失败:', err)
      }
    }, 2000) // 每2秒检查一次

    // 5分钟后停止检查
    setTimeout(() => {
      clearInterval(interval)
      setCheckingStatus(false)
    }, 300000)
  }

  if (!qrCodeData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">微信扫码登录</CardTitle>
        <CardDescription>
          使用微信扫描二维码登录 CopyTab
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-center">
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <QrCode className="h-48 w-48 text-gray-400" />
              <div className="text-sm text-gray-500 mt-2">
                {qrCodeData.qr_code_url ? (
                  <img 
                    src={qrCodeData.qr_code_url} 
                    alt="微信登录二维码" 
                    className="w-48 h-48"
                  />
                ) : (
                  '二维码加载中...'
                )}
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            {checkingStatus ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>等待扫码登录...</span>
              </div>
            ) : (
              '二维码已过期，请刷新页面重新获取'
            )}
          </div>

          <Button 
            onClick={generateQRCode}
            disabled={loading || checkingStatus}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              '重新生成二维码'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface AuthTabsProps {
  onLoginSuccess?: () => void
}

export function AuthTabs({ onLoginSuccess }: AuthTabsProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'wechat'>('email')

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`flex-1 py-2 px-4 text-center font-medium ${
            activeTab === 'email'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('email')}
        >
          <Mail className="inline-block w-4 h-4 mr-2" />
          邮箱登录
        </button>
        <button
          className={`flex-1 py-2 px-4 text-center font-medium ${
            activeTab === 'wechat'
              ? 'border-b-2 border-green-500 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('wechat')}
        >
          <QrCode className="inline-block w-4 h-4 mr-2" />
          微信登录
        </button>
      </div>

      {activeTab === 'email' ? (
        <LoginForm onLoginSuccess={onLoginSuccess} />
      ) : (
        <WechatLogin onLoginSuccess={onLoginSuccess} />
      )}
    </div>
  )
}