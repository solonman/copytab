import { supabase } from './supabaseClient';
import type { Project } from '../types'

export interface ProjectCreateData {
  name: string
  description?: string
  user_id?: string
  is_public?: boolean
  tags?: string[] | null
  metadata?: any | null
}

export interface ProjectUpdateData {
  name?: string
  description?: string
  is_public?: boolean
  tags?: string[] | null
  metadata?: any | null
}

export interface ProjectServiceResponse<T> {
  data: T | null
  error: string | null
}

class ProjectService {
  async getUserProjects(userId: string): Promise<ProjectServiceResponse<Project[]>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as Project[], error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : '获取用户项目失败' }
    }
  }

  async getProjects(): Promise<ProjectServiceResponse<Project[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: '用户未登录' }
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as Project[], error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : '获取项目失败' }
    }
  }

  async getProject(id: string): Promise<ProjectServiceResponse<Project>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: '用户未登录' }
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as Project, error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : '获取项目失败' }
    }
  }

  async createProject(data: ProjectCreateData): Promise<ProjectServiceResponse<Project>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: '用户未登录' }
      }

      const projectData = {
        name: data.name,
        description: data.description || '',
        user_id: user.id,
        is_public: data.is_public ?? false,
        tags: data.tags ?? null,
        metadata: data.metadata ?? null
      }

      const { data: project, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: project as Project, error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : '创建项目失败' }
    }
  }

  async updateProject(id: string, data: ProjectUpdateData): Promise<ProjectServiceResponse<Project>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: '用户未登录' }
      }

      const updateData: any = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.is_public !== undefined) updateData.is_public = data.is_public
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.metadata !== undefined) updateData.metadata = data.metadata
      updateData.updated_at = new Date().toISOString()

      const { data: project, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: project as Project, error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : '更新项目失败' }
    }
  }

  async deleteProject(id: string): Promise<ProjectServiceResponse<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: false, error: '用户未登录' }
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        return { data: false, error: error.message }
      }

      return { data: true, error: null }
    } catch (error) {
      return { data: false, error: error instanceof Error ? error.message : '删除项目失败' }
    }
  }

  async searchProjects(query: string): Promise<ProjectServiceResponse<Project[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: '用户未登录' }
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as Project[], error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : '搜索项目失败' }
    }
  }
}

export const projectService = new ProjectService()