import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'copytab-auth-token',
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-application-name': 'copytab',
    },
  },
  db: {
    schema: 'public',
  },
})

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
      }
      documents: {
        Row: {
          id: string
          project_id: string
          title: string
          content: string
          created_at: string
          updated_at: string
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          content: string
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          content?: string
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
      }
      standard_info: {
        Row: {
          id: string
          user_id: string
          category: string
          title: string
          content: string
          tags: string[]
          created_at: string
          updated_at: string
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          title: string
          content: string
          tags?: string[]
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          title?: string
          content?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
      }
      document_chunks: {
        Row: {
          id: string
          document_id: string
          content: string
          embedding: number[]
          chunk_index: number
          metadata: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          content: string
          embedding: number[]
          chunk_index: number
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          content?: string
          embedding?: number[]
          chunk_index?: number
          metadata?: Record<string, any>
          created_at?: string
        }
      }
      shared_documents: {
        Row: {
          id: string
          document_id: string
          share_token: string
          permissions: string
          expires_at: string | null
          created_at: string
          updated_at: string
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          document_id: string
          share_token: string
          permissions: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          document_id?: string
          share_token?: string
          permissions?: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
      }
    }
  }
}

export type Tables = Database['public']['Tables']
export type Row<T extends keyof Tables> = Tables[T]['Row']
export type Insert<T extends keyof Tables> = Tables[T]['Insert']
export type Update<T extends keyof Tables> = Tables[T]['Update']

export default supabase