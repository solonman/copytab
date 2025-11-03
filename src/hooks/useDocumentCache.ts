import { useState, useCallback, useEffect } from 'react'
import { offlineService } from '../services/offlineService'
import { Tables } from '../types/database'
import { useAuth } from './useAuth'

export type Document = Tables<'documents'>

export interface DocumentCacheState {
  documents: Document[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useDocumentCache(projectId?: string) {
  const { user } = useAuth()
  const [state, setState] = useState<DocumentCacheState>({
    documents: [],
    loading: false,
    error: null,
    lastUpdated: null
  })

  const loadDocuments = useCallback(async () => {
    if (!projectId || !user) return

    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const documents = await offlineService.getDocuments(user.id, projectId)
      setState({
        documents,
        loading: false,
        error: null,
        lastUpdated: new Date()
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '加载文档失败'
      }))
    }
  }, [projectId, user])

  const saveDocument = useCallback(async (document: Partial<Document>) => {
    try {
      const savedDoc = await offlineService.saveDocument({
        ...document,
        project_id: projectId!
      } as Document)
      
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(doc => 
          doc.id === savedDoc.id ? savedDoc : doc
        ).concat(savedDoc.id ? [] : [savedDoc])
      }))
      
      return savedDoc
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '保存文档失败')
    }
  }, [projectId])

  const deleteDocument = useCallback(async (documentId: string) => {
    if (!user) return
    
    try {
      await offlineService.deleteDocument(user.id, documentId)
      
      setState(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => doc.id !== documentId)
      }))
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '删除文档失败')
    }
  }, [user])

  const getDocument = useCallback(async (documentId: string): Promise<Document | null> => {
    if (!user) return null
    
    try {
      return await offlineService.getDocument(user.id, documentId)
    } catch (error) {
      console.error('获取文档失败:', error)
      return null
    }
  }, [user])

  const searchDocuments = useCallback(async (query: string): Promise<Document[]> => {
    if (!projectId || !user) return []
    
    try {
      return await offlineService.searchDocuments(user.id, query)
    } catch (error) {
      console.error('搜索文档失败:', error)
      return []
    }
  }, [projectId, user])

  // 监听离线数据变化
  useEffect(() => {
    if (!projectId) return

    const handleDataChange = () => {
      loadDocuments()
    }

    // 监听离线数据变化事件
    window.addEventListener('offline-data-changed', handleDataChange)
    
    return () => {
      window.removeEventListener('offline-data-changed', handleDataChange)
    }
  }, [projectId, loadDocuments])

  // 初始加载
  useEffect(() => {
    if (user) {
      loadDocuments()
    }
  }, [loadDocuments, user])

  return {
    ...state,
    loadDocuments,
    saveDocument,
    deleteDocument,
    getDocument,
    searchDocuments
  }
}

export function useDocumentCacheById(documentId: string) {
  const { user } = useAuth()
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDocument = useCallback(async () => {
    if (!documentId || !user) return

    setLoading(true)
    setError(null)
    
    try {
      const doc = await offlineService.getDocument(user.id, documentId)
      setDocument(doc)
    } catch (error) {
      setError(error instanceof Error ? error.message : '加载文档失败')
    } finally {
      setLoading(false)
    }
  }, [documentId, user])

  const updateDocument = useCallback(async (updates: Partial<Document>) => {
    if (!document || !user) return

    try {
      const updatedDoc = await offlineService.saveDocument({
        ...document,
        ...updates,
        id: documentId,
        user_id: user.id
      })
      setDocument(updatedDoc)
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '更新文档失败')
    }
  }, [document, documentId, user])

  // 监听文档变化
  useEffect(() => {
    if (!documentId) return

    const handleDocumentChange = (event: CustomEvent) => {
      if (event.detail.documentId === documentId) {
        loadDocument()
      }
    }

    window.addEventListener('document-changed', handleDocumentChange as EventListener)
    
    return () => {
      window.removeEventListener('document-changed', handleDocumentChange as EventListener)
    }
  }, [documentId, loadDocument])

  // 初始加载
  useEffect(() => {
    if (user) {
      loadDocument()
    }
  }, [loadDocument, user])

  return {
    document,
    loading,
    error,
    loadDocument,
    updateDocument
  }
}