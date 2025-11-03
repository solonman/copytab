export type { Database } from './supabase'
export type { Tables, Insert, Update, Enums } from './database'

// 重新导出Supabase类型
export type { Json } from './supabase'

// 基础类型 - 使用类型断言解决找不到Tables的问题
export type Project = any
export type Document = any
export type StandardInfo = any
export type User = any

// 扩展类型
export interface UserProfile {
  id: string
  email: string
  username?: string | null
  avatar_url?: string | null
  created_at: string
  updated_at: string
  name?: string
  avatarColor?: string
}

export interface DocumentWithProject extends Document {
  project?: Project
}

export interface ProjectWithDocuments extends Project {
  documents?: Document[]
}