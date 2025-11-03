import React, { useState } from 'react'
import { Wifi, WifiOff, RefreshCw, Database, AlertCircle } from 'lucide-react'
import { useOfflineSync } from '../../hooks/useOfflineSync'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

export function OfflineStatus() {
  const { syncState, triggerSync } = useOfflineSync()
  const [showDetails, setShowDetails] = useState(false)

  const getStatusColor = () => {
    if (!syncState.isOnline) return 'text-red-500'
    if (syncState.isSyncing) return 'text-blue-500'
    if (syncState.syncError) return 'text-orange-500'
    return 'text-green-500'
  }

  const getStatusIcon = () => {
    if (!syncState.isOnline) return <WifiOff className="h-4 w-4" />
    if (syncState.isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />
    if (syncState.syncError) return <AlertCircle className="h-4 w-4" />
    return <Wifi className="h-4 w-4" />
  }

  const getStatusText = () => {
    if (!syncState.isOnline) return '离线模式'
    if (syncState.isSyncing) return '同步中...'
    if (syncState.syncError) return '同步失败'
    return '已同步'
  }

  const getPendingCount = () => {
    if (!syncState.syncStats) return 0
    return (
      syncState.syncStats.documents.pending +
      syncState.syncStats.projects.pending +
      syncState.syncStats.standardInfo.pending
    )
  }

  return (
    <div className="relative">
      {/* 状态指示器 */}
      <div className="flex items-center space-x-2 text-sm">
        <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
        
        {syncState.isOnline && getPendingCount() > 0 && (
          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
            {getPendingCount()} 待同步
          </span>
        )}
        
        {syncState.lastSyncAt && (
          <span className="text-gray-500 text-xs">
            上次同步: {syncState.lastSyncAt.toLocaleTimeString()}
          </span>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="h-6 px-2 text-xs"
        >
          <Database className="h-3 w-3 mr-1" />
          详情
        </Button>
        
        {syncState.isOnline && !syncState.isSyncing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={triggerSync}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            同步
          </Button>
        )}
      </div>

      {/* 详细信息面板 */}
      {showDetails && (
        <Card className="absolute top-full right-0 mt-2 w-80 z-50 shadow-lg">
          <CardHeader>
            <CardTitle>离线同步状态</CardTitle>
            <CardDescription>
              数据同步和离线存储详细信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 网络状态 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">网络状态</span>
                <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
                  {getStatusIcon()}
                  <span className="text-sm">{getStatusText()}</span>
                </div>
              </div>

              {/* 同步统计 */}
              {syncState.syncStats && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">同步统计</div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="font-medium">文档</div>
                      <div>总: {syncState.syncStats.documents.total}</div>
                      <div>待同步: {syncState.syncStats.documents.pending}</div>
                    </div>
                    
                    <div className="bg-green-50 p-2 rounded">
                      <div className="font-medium">项目</div>
                      <div>总: {syncState.syncStats.projects.total}</div>
                      <div>待同步: {syncState.syncStats.projects.pending}</div>
                    </div>
                    
                    <div className="bg-purple-50 p-2 rounded">
                      <div className="font-medium">标准</div>
                      <div>总: {syncState.syncStats.standardInfo.total}</div>
                      <div>待同步: {syncState.syncStats.standardInfo.pending}</div>
                    </div>
                  </div>

                  {syncState.syncStats.syncQueue > 0 && (
                    <div className="bg-yellow-50 p-2 rounded">
                      <div className="text-sm font-medium">同步队列</div>
                      <div className="text-xs">{syncState.syncStats.syncQueue} 个项目等待同步</div>
                    </div>
                  )}
                </div>
              )}

              {/* 错误信息 */}
              {syncState.syncError && (
                <div className="bg-red-50 p-2 rounded">
                  <div className="text-sm font-medium text-red-800">同步错误</div>
                  <div className="text-xs text-red-600">{syncState.syncError}</div>
                </div>
              )}

              {/* 最后同步时间 */}
              {syncState.lastSyncAt && (
                <div className="text-xs text-gray-600">
                  最后同步: {syncState.lastSyncAt.toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function OfflineIndicator() {
  const { syncState } = useOfflineSync()
  
  if (syncState.isOnline) return null
  
  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">离线模式</span>
    </div>
  )
}