import { useState, useEffect, useCallback } from 'react'
import { offlineService, offlineDB } from '../services/offlineService'
import { projectService } from '../services/projectService'
import { projectService as databaseProjectService, documentService, standardInfoService } from '../services/databaseService'
import { useAuth } from './useAuth'

export interface SyncState {
  isOnline: boolean
  isSyncing: boolean
  lastSyncAt: Date | null
  syncError: string | null
  syncStats: {
    documents: { total: number; synced: number; pending: number; error: number }
    projects: { total: number; synced: number; pending: number; error: number }
    standardInfo: { total: number; synced: number; pending: number; error: number }
    syncQueue: number
    lastSyncAt: number | null
  } | null
}

export function useOfflineSync() {
  const { user } = useAuth()
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: offlineService.isOnline(),
    isSyncing: false,
    lastSyncAt: null,
    syncError: null,
    syncStats: null
  })

  // 监听网络状态变化
  useEffect(() => {
    const unsubscribe = offlineService.onNetworkChange((online) => {
      setSyncState(prev => ({ ...prev, isOnline: online }))
      
      // 如果恢复在线状态，自动同步
      if (online && user) {
        syncData()
      }
    })

    return unsubscribe
  }, [])

  // 监听用户变化，更新同步状态
  useEffect(() => {
    if (user) {
      loadSyncStats()
      
      // 如果在线，立即同步
      if (syncState.isOnline) {
        syncData()
      }
    } else {
      setSyncState(prev => ({
        ...prev,
        lastSyncAt: null,
        syncStats: null,
        syncError: null
      }))
    }
  }, [user])

  // 加载同步统计信息
  const loadSyncStats = useCallback(async () => {
    if (!user) return

    try {
      const stats = await offlineService.getSyncStats(user.id)
      setSyncState(prev => ({
        ...prev,
        syncStats: stats,
        lastSyncAt: stats.lastSyncAt ? new Date(stats.lastSyncAt) : null
      }))
    } catch (error) {
      console.error('加载同步统计失败:', error)
    }
  }, [user])

  // 同步数据到服务器
  const syncData = useCallback(async () => {
    if (!user || !syncState.isOnline || syncState.isSyncing) return

    setSyncState(prev => ({ ...prev, isSyncing: true, syncError: null }))

    try {
      // 1. 获取待同步的项目
      const offlineProjects = await offlineService.getUserOfflineProjects(user.id)
      const pendingProjects = offlineProjects.filter(p => p.sync_status === 'pending')

      for (const project of pendingProjects) {
        try {
          if (project.id && !project.id.startsWith('temp_')) {
            // 更新现有项目
            await projectService.updateProject(project.id, {
              name: project.name,
              description: project.description,
              is_public: project.is_public,
              tags: project.tags,
              metadata: project.metadata
            })
          } else {
            // 创建新项目
            const newProject = await projectService.createProject({
              name: project.name,
              description: project.description,
              user_id: user.id,
              is_public: project.is_public,
              tags: project.tags,
              metadata: project.metadata
            })
            
            // 更新离线项目ID
            await offlineDB.projects.update(project.id!, {
              id: (newProject as any).id,
              sync_status: 'synced'
            })
          }
          
          // 标记为已同步
          await offlineService.updateSyncStatus('projects', project.id, 'synced')
        } catch (error) {
          console.error(`同步项目失败: ${project.name}`, error)
          await offlineService.updateSyncStatus('projects', project.id, 'error', error.message)
        }
      }

      // 2. 获取待同步的文档
      const offlineDocuments = await offlineService.getUserOfflineDocuments(user.id)
      const pendingDocuments = offlineDocuments.filter(d => d.sync_status === 'pending')

      for (const document of pendingDocuments) {
        try {
          if (document.id && !document.id.startsWith('temp_')) {
            // 更新现有文档
            await documentService.updateDocument(document.id, {
              title: document.title,
              content: document.content,
              is_public: document.is_public,
              tags: document.tags,
              metadata: document.metadata
            })
          } else {
            // 创建新文档
            const newDocument = await documentService.createDocument({
              title: document.title,
              content: document.content,
              project_id: document.project_id,
              user_id: user.id,
              is_public: document.is_public,
              tags: document.tags,
              metadata: document.metadata
            })
            
            // 更新离线文档ID
            await offlineDB.documents.update(document.id!, {
              id: newDocument.id,
              sync_status: 'synced'
            })
          }
          
          // 标记为已同步
          await offlineService.updateSyncStatus('documents', document.id, 'synced')
        } catch (error) {
          console.error(`同步文档失败: ${document.title}`, error)
          await offlineService.updateSyncStatus('documents', document.id, 'error', error.message)
        }
      }

      // 3. 获取待同步的标准信息
      const offlineStandardInfo = await offlineService.getUserOfflineStandardInfo(user.id)
      const pendingStandardInfo = offlineStandardInfo.filter(s => s.sync_status === 'pending')

      for (const standard of pendingStandardInfo) {
        try {
          if (standard.id && !standard.id.startsWith('temp_')) {
            // 更新现有标准信息
            await standardInfoService.updateStandardInfo(standard.id, {
              title: standard.title,
              content: standard.content,
              category: standard.category,
              tags: standard.tags,
              embedding: standard.embedding
            })
          } else {
            // 创建新标准信息
            await standardInfoService.createStandardInfo({
              title: standard.title,
              content: standard.content,
              category: standard.category,
              user_id: user.id,
              tags: standard.tags,
              embedding: standard.embedding
            })
          }
          
          // 标记为已同步
          await offlineService.updateSyncStatus('standard_info', standard.id, 'synced')
        } catch (error) {
          console.error(`同步标准信息失败: ${standard.title}`, error)
          await offlineService.updateSyncStatus('standard_info', standard.id, 'error', error.message)
        }
      }

      // 4. 从服务器同步最新数据
      await syncFromServer()

      // 5. 清理过期缓存
      await offlineService.clearExpiredCache()

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date()
      }))

    } catch (error) {
      console.error('同步数据失败:', error)
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error.message
      }))
    }

    // 重新加载统计信息
    await loadSyncStats()
  }, [user, syncState.isOnline, syncState.isSyncing])

  // 从服务器同步数据
  const syncFromServer = useCallback(async () => {
    if (!user) return

    try {
      // 获取服务器端最新数据
      const [serverProjects, serverDocuments, serverStandardInfo] = await Promise.all([
        databaseProjectService.getUserProjects(user.id),
        documentService.getUserDocuments(user.id),
        standardInfoService.getUserStandardInfo(user.id)
      ])

      // 更新离线数据库中的数据
      const now = new Date().toISOString()

      // 同步项目
      for (const project of serverProjects) {
        await offlineDB.projects.put({
          ...project,
          sync_status: 'synced',
          last_sync_at: now,
          local_updated_at: now
        })
      }

      // 同步文档
      for (const document of serverDocuments) {
        await offlineDB.documents.put({
          ...document,
          sync_status: 'synced',
          last_sync_at: now,
          local_updated_at: now
        })
      }

      // 同步标准信息
      for (const standard of serverStandardInfo) {
        await offlineDB.standard_info.put({
          ...standard,
          sync_status: 'synced',
          last_sync_at: now,
          local_updated_at: now
        })
      }

    } catch (error) {
      console.error('从服务器同步数据失败:', error)
      throw error
    }
  }, [user])

  // 手动触发同步
  const triggerSync = useCallback(() => {
    if (syncState.isOnline && user) {
      syncData()
    }
  }, [syncData, syncState.isOnline, user])

  // 清空离线数据
  const clearOfflineData = useCallback(async () => {
    if (!user) return

    try {
      await offlineService.clearAllOfflineData()
      setSyncState(prev => ({
        ...prev,
        lastSyncAt: null,
        syncStats: null
      }))
    } catch (error) {
      console.error('清空离线数据失败:', error)
    }
  }, [user])

  return {
    syncState,
    syncData,
    syncFromServer,
    triggerSync,
    clearOfflineData,
    loadSyncStats
  }
}

// 导出离线数据库实例供组件直接使用
export { offlineDB } from '../services/offlineService'