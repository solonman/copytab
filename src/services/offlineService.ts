import Dexie, { Table } from 'dexie'

// 离线数据库接口定义
export interface OfflineDocument {
  id: string
  title: string
  content: string
  project_id: string
  user_id: string
  version: number
  is_public: boolean
  tags: string[] | null
  metadata: any | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  sync_status: 'synced' | 'pending' | 'error'
  last_sync_at: string | null
  local_updated_at: string
}

export interface OfflineProject {
  id: string
  name: string
  description: string | null
  user_id: string
  is_public: boolean
  tags: string[] | null
  metadata: any | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  sync_status: 'synced' | 'pending' | 'error'
  last_sync_at: string | null
  local_updated_at: string
}

export interface OfflineStandardInfo {
  id: string
  title: string
  content: string
  category: string
  tags: string[] | null
  embedding: string | null
  user_id: string
  is_public: boolean
  created_at: string
  updated_at: string
  sync_status: 'synced' | 'pending' | 'error'
  last_sync_at: string | null
  local_updated_at: string
}

export interface SyncQueueItem {
  id: string
  table: 'documents' | 'projects' | 'standard_info'
  operation: 'create' | 'update' | 'delete'
  data: any
  original_id: string
  user_id: string
  created_at: string
  retry_count: number
  last_error: string | null
}

export interface OfflineCache {
  id: string
  key: string
  data: any
  expires_at: string
  created_at: string
}

// Dexie数据库类
export class OfflineDatabase extends Dexie {
  documents!: Table<OfflineDocument>
  projects!: Table<OfflineProject>
  standard_info!: Table<OfflineStandardInfo>
  sync_queue!: Table<SyncQueueItem>
  cache!: Table<OfflineCache>

  constructor() {
    super('CopyTabOfflineDB')
    this.version(1).stores({
      documents: 'id, project_id, user_id, sync_status, local_updated_at',
      projects: 'id, user_id, sync_status, local_updated_at',
      standard_info: 'id, user_id, category, sync_status, local_updated_at',
      sync_queue: 'id, table, operation, user_id, created_at',
      cache: 'id, key, expires_at'
    })
  }
}

// 创建数据库实例
export const offlineDB = new OfflineDatabase()

// 离线同步服务
export const offlineService = {
  // 检查是否在线
  isOnline(): boolean {
    return navigator.onLine
  },

  // 监听网络状态变化
  onNetworkChange(callback: (online: boolean) => void) {
    const handleOnline = () => callback(true)
    const handleOffline = () => callback(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  },

  // 保存文档到离线数据库
  async saveDocumentOffline(document: Partial<OfflineDocument>) {
    const now = new Date().toISOString()
    const offlineDoc: OfflineDocument = {
      ...document,
      sync_status: 'pending',
      last_sync_at: null,
      local_updated_at: now
    } as OfflineDocument

    await offlineDB.documents.put(offlineDoc)
    
    // 添加到同步队列
    await this.addToSyncQueue('documents', document.id ? 'update' : 'create', offlineDoc)
    
    return offlineDoc
  },

  // 保存项目到离线数据库
  async saveProjectOffline(project: Partial<OfflineProject>) {
    const now = new Date().toISOString()
    const offlineProject: OfflineProject = {
      ...project,
      sync_status: 'pending',
      last_sync_at: null,
      local_updated_at: now
    } as OfflineProject

    await offlineDB.projects.put(offlineProject)
    
    // 添加到同步队列
    await this.addToSyncQueue('projects', project.id ? 'update' : 'create', offlineProject)
    
    return offlineProject
  },

  // 保存标准信息到离线数据库
  async saveStandardInfoOffline(standardInfo: Partial<OfflineStandardInfo>) {
    const now = new Date().toISOString()
    const offlineStandard: OfflineStandardInfo = {
      ...standardInfo,
      sync_status: 'pending',
      last_sync_at: null,
      local_updated_at: now
    } as OfflineStandardInfo

    await offlineDB.standard_info.put(offlineStandard)
    
    // 添加到同步队列
    await this.addToSyncQueue('standard_info', standardInfo.id ? 'update' : 'create', offlineStandard)
    
    return offlineStandard
  },

  // 添加到同步队列
  async addToSyncQueue(
    table: 'documents' | 'projects' | 'standard_info',
    operation: 'create' | 'update' | 'delete',
    data: any
  ) {
    const queueItem: SyncQueueItem = {
      id: `${table}_${data.id}_${Date.now()}`,
      table,
      operation,
      data,
      original_id: data.id,
      user_id: data.user_id,
      created_at: new Date().toISOString(),
      retry_count: 0,
      last_error: null
    }

    await offlineDB.sync_queue.add(queueItem)
    return queueItem
  },

  // 获取用户的离线文档
  async getUserOfflineDocuments(userId: string) {
    return await offlineDB.documents
      .where('user_id')
      .equals(userId)
      .toArray()
  },

  // 获取文档（兼容接口）
  async getDocuments(userId: string, projectId?: string) {
    let query = offlineDB.documents.where('user_id').equals(userId)
    
    if (projectId) {
      query = query.and(item => item.project_id === projectId)
    }
    
    return await query.toArray()
  },

  // 获取用户的离线项目
  async getUserOfflineProjects(userId: string) {
    return await offlineDB.projects
      .where('user_id')
      .equals(userId)
      .toArray()
  },

  // 获取用户的离线标准信息
  async getUserOfflineStandardInfo(userId: string, category?: string) {
    let query = offlineDB.standard_info.where('user_id').equals(userId)
    
    if (category) {
      query = query.and(item => item.category === category)
    }
    
    return await query.toArray()
  },

  // 获取待同步的队列项目
  async getPendingSyncItems(userId: string) {
    return await offlineDB.sync_queue
      .where('user_id')
      .equals(userId)
      .toArray()
  },

  // 清空同步队列
  async clearSyncQueue(userId: string) {
    const items = await this.getPendingSyncItems(userId)
    const ids = items.map(item => item.id)
    await offlineDB.sync_queue.bulkDelete(ids)
  },

  // 更新同步状态
  async updateSyncStatus(
    table: 'documents' | 'projects' | 'standard_info',
    id: string,
    status: 'synced' | 'pending' | 'error',
    error?: string
  ) {
    const now = new Date().toISOString()
    
    if (table === 'documents') {
      await offlineDB.documents.update(id, {
        sync_status: status,
        last_sync_at: status === 'synced' ? now : null
      })
    } else if (table === 'projects') {
      await offlineDB.projects.update(id, {
        sync_status: status,
        last_sync_at: status === 'synced' ? now : null
      })
    } else if (table === 'standard_info') {
      await offlineDB.standard_info.update(id, {
        sync_status: status,
        last_sync_at: status === 'synced' ? now : null
      })
    }

    if (error) {
      // 更新同步队列中的错误信息
      const queueItems = await offlineDB.sync_queue
        .where('original_id')
        .equals(id)
        .toArray()
      
      for (const item of queueItems) {
        await offlineDB.sync_queue.update(item.id, {
          last_error: error,
          retry_count: item.retry_count + 1
        })
      }
    }
  },

  // 缓存相关方法
  async setCache(key: string, data: any, ttlMinutes = 60) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
    
    await offlineDB.cache.put({
      id: `${key}_${Date.now()}`,
      key,
      data,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    })
  },

  async getCache(key: string): Promise<any | null> {
    const now = new Date().toISOString()
    const cached = await offlineDB.cache
      .where('key')
      .equals(key)
      .and(item => item.expires_at > now)
      .first()
    
    return cached?.data || null
  },

  async clearExpiredCache() {
    const now = new Date().toISOString()
    const expired = await offlineDB.cache
      .where('expires_at')
      .below(now)
      .toArray()
    
    const ids = expired.map(item => item.id)
    await offlineDB.cache.bulkDelete(ids)
  },

  // 清空所有离线数据
  async clearAllOfflineData() {
    await offlineDB.documents.clear()
    await offlineDB.projects.clear()
    await offlineDB.standard_info.clear()
    await offlineDB.sync_queue.clear()
    await offlineDB.cache.clear()
  },

  // 获取同步统计信息
  async getSyncStats(userId: string) {
    const documents = await this.getUserOfflineDocuments(userId)
    const projects = await this.getUserOfflineProjects(userId)
    const standardInfo = await this.getUserOfflineStandardInfo(userId)
    const syncQueue = await this.getPendingSyncItems(userId)

    return {
      documents: {
        total: documents.length,
        synced: documents.filter(d => d.sync_status === 'synced').length,
        pending: documents.filter(d => d.sync_status === 'pending').length,
        error: documents.filter(d => d.sync_status === 'error').length
      },
      projects: {
        total: projects.length,
        synced: projects.filter(p => p.sync_status === 'synced').length,
        pending: projects.filter(p => p.sync_status === 'pending').length,
        error: projects.filter(p => p.sync_status === 'error').length
      },
      standardInfo: {
        total: standardInfo.length,
        synced: standardInfo.filter(s => s.sync_status === 'synced').length,
        pending: standardInfo.filter(s => s.sync_status === 'pending').length,
        error: standardInfo.filter(s => s.sync_status === 'error').length
      },
      syncQueue: syncQueue.length,
      lastSyncAt: documents.length > 0 ? Math.max(...documents.map(d => new Date(d.last_sync_at || 0).getTime())) : null
    }
  },

  // 获取单个文档
  async getDocument(userId: string, documentId: string) {
    return await offlineDB.documents
      .where('user_id')
      .equals(userId)
      .and(item => item.id === documentId)
      .first()
  },

  // 删除文档
  async deleteDocument(userId: string, documentId: string) {
    await offlineDB.documents.delete(documentId)
    
    // 添加到同步队列
    await this.addToSyncQueue('documents', 'delete', {
      id: documentId,
      user_id: userId
    })
  },

  // 保存文档（兼容接口）
  async saveDocument(document: Partial<OfflineDocument>) {
    return await this.saveDocumentOffline(document)
  },

  // 搜索文档
  async searchDocuments(userId: string, query: string) {
    return await offlineDB.documents
      .where('user_id')
      .equals(userId)
      .and(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.content.toLowerCase().includes(query.toLowerCase())
      )
      .toArray()
  },

  // 获取缓存的补全结果
  async getCachedCompletions() {
    return await offlineDB.cache
      .where('key')
      .startsWith('completion_')
      .toArray()
  },

  // 保存缓存的补全结果
  async saveCachedCompletion(cache: any) {
    await offlineDB.cache.put({
      id: cache.id,
      key: `completion_${cache.id}`,
      data: cache,
      expires_at: cache.expiresAt,
      created_at: cache.createdAt.toISOString()
    })
  },

  // 清空缓存的补全结果
  async clearCachedCompletions() {
    const completions = await offlineDB.cache
      .where('key')
      .startsWith('completion_')
      .toArray()
    
    const ids = completions.map(item => item.id)
    await offlineDB.cache.bulkDelete(ids)
  }
}

export default offlineService