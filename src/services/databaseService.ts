import { supabase } from './supabaseClient'
import type { Insert, Update } from '../types'

// 项目相关的数据访问
export const projectService = {
  // 获取用户的所有项目
  async getUserProjects(userId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // 获取单个项目
  async getProject(id: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    
    if (error) throw error
    return data
  },

  // 创建项目
  async createProject(project: Insert<'projects'>) {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 更新项目
  async updateProject(id: string, updates: Update<'projects'>) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 删除项目（软删除）
  async deleteProject(id: string) {
    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
    return true
  }
}

// 文档相关的数据访问
export const documentService = {
  // 获取用户的所有文档
  async getUserDocuments(userId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // 获取项目下的所有文档
  async getProjectDocuments(projectId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // 获取单个文档
  async getDocument(id: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    
    if (error) throw error
    return data
  },

  // 创建文档
  async createDocument(document: Insert<'documents'>) {
    const { data, error } = await supabase
      .from('documents')
      .insert(document)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 更新文档
  async updateDocument(id: string, updates: Update<'documents'>) {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 删除文档（软删除）
  async deleteDocument(id: string) {
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
    return true
  }
}

// 标准信息相关的数据访问
export const standardInfoService = {
  // 获取用户的所有标准信息
  async getUserStandardInfo(userId: string, category?: string) {
    let query = supabase
      .from('standard_info')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
    
    if (category) {
      query = query.eq('category', category)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  // 搜索标准信息
  async searchStandardInfo(userId: string, query: string, category?: string, limit = 10) {
    const { data, error } = await supabase
      .rpc('search_standard_info', {
        user_id: userId,
        search_query: query,
        search_category: category,
        match_limit: limit
      })
    
    if (error) throw error
    return data
  },

  // 创建标准信息
  async createStandardInfo(info: Insert<'standard_info'>) {
    const { data, error } = await supabase
      .from('standard_info')
      .insert(info)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 更新标准信息
  async updateStandardInfo(id: string, updates: Update<'standard_info'>) {
    const { data, error } = await supabase
      .from('standard_info')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 删除标准信息（软删除）
  async deleteStandardInfo(id: string) {
    const { error } = await supabase
      .from('standard_info')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
    return true
  }
}

// 用户配置相关的数据访问
export const userConfigService = {
  // 获取用户配置
  async getUserConfig(userId: string) {
    const { data, error } = await supabase
      .from('user_configs')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // 创建或更新用户配置
  async upsertUserConfig(config: { user_id: string; config_key: string; config_value: any }) {
    const { data, error } = await supabase
      .from('user_configs')
      .upsert(config)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// 文档分块相关的数据访问（用于RAG）
export const documentChunkService = {
  // 创建文档分块
  async createDocumentChunks(chunks: Insert<'document_chunks'>[]) {
    const { data, error } = await supabase
      .from('document_chunks')
      .insert(chunks)
      .select()
    
    if (error) throw error
    return data
  },

  // 搜索相似分块
  async searchSimilarChunks(queryEmbedding: number[], threshold = 0.7, limit = 10) {
    const { data, error } = await supabase
      .rpc('search_similar_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit
      })
    
    if (error) throw error
    return data
  },

  // 删除文档的所有分块
  async deleteDocumentChunks(documentId: string) {
    const { error } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)
    
    if (error) throw error
    return true
  }
}

// 分享文档相关的数据访问
export const sharedDocumentService = {
  // 创建分享
  async createSharedDocument(share: Insert<'shared_documents'>) {
    const { data, error } = await supabase
      .from('shared_documents')
      .insert(share)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 通过分享令牌获取分享信息
  async getSharedDocumentByToken(token: string) {
    const { data, error } = await supabase
      .from('shared_documents')
      .select('*')
      .eq('share_token', token)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .single()
    
    if (error) throw error
    return data
  },

  // 更新分享
  async updateSharedDocument(id: string, updates: Update<'shared_documents'>) {
    const { data, error } = await supabase
      .from('shared_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 删除分享
  async deleteSharedDocument(id: string) {
    const { error } = await supabase
      .from('shared_documents')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  }
}

export default {
  projectService,
  documentService,
  standardInfoService,
  userConfigService,
  documentChunkService,
  sharedDocumentService
}