import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card } from '../ui/card'
import { Alert } from '../ui/alert'
import { Upload, Search, FileText, Loader2 } from 'lucide-react'
import { ragService, standardInfoRagService } from '../../services/ragService'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/supabaseClient'

interface DocumentUploadProps {
  projectId: string
  onUploadComplete?: (documentId: string) => void
}

interface SearchResult {
  id: string
  content: string
  similarity: number
  document_title?: string
  project_name?: string
  category?: string
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ projectId, onUploadComplete }) => {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setSuccess(false)
    }
  }

  const handleUpload = async () => {
    if (!file || !user) return

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      // 读取文件内容
      const content = await file.text()
      
      // 创建文档记录
      const { data: document } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          title: file.name,
          content: content,
          metadata: {
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            upload_date: new Date().toISOString()
          }
        })
        .select()
        .single()

      if (!document) {
        throw new Error('创建文档失败')
      }

      // 处理文档分块和向量化
      await ragService.storeDocumentChunks(document.id, content)
      
      setSuccess(true)
      setFile(null)
      onUploadComplete?.(document.id)
      
      // 清空文件输入
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Input
          id="file-upload"
          type="file"
          accept=".txt,.md,.doc,.docx,.pdf"
          onChange={handleFileChange}
          className="flex-1"
          disabled={uploading}
        />
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="flex items-center space-x-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span>{uploading ? '处理中...' : '上传'}</span>
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <div className="text-sm">{error}</div>
        </Alert>
      )}

      {success && (
        <Alert>
          <div className="text-sm">文档上传成功，已自动分块和向量化处理</div>
        </Alert>
      )}

      {file && (
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{file.name}</span>
            <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        </Card>
      )}
    </div>
  )
}

interface DocumentSearchProps {
  onSearchResults?: (results: SearchResult[]) => void
}

export const DocumentSearch: React.FC<DocumentSearchProps> = ({ onSearchResults }) => {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchType, setSearchType] = useState<'documents' | 'standard_info'>('documents')

  const handleSearch = async () => {
    if (!query.trim() || !user) return

    setSearching(true)
    setError(null)

    try {
      let searchResults: SearchResult[] = []

      if (searchType === 'documents') {
        // 搜索文档
        const docResults = await ragService.searchSimilarDocuments(query, user.id)
        searchResults = docResults.map((result: any) => ({
          id: result.id,
          content: result.content,
          similarity: result.similarity,
          document_title: result.document_title,
          project_name: result.project_name
        }))
      } else {
        // 搜索标准信息
        const standardResults = await standardInfoRagService.searchSimilarStandardInfo(query, user.id)
        searchResults = standardResults.map((result: any) => ({
          id: result.id,
          content: result.content,
          similarity: result.similarity,
          category: result.category,
          document_title: result.title
        }))
      }

      setResults(searchResults)
      onSearchResults?.(searchResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败')
    } finally {
      setSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder={searchType === 'documents' ? '搜索文档内容...' : '搜索标准信息...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value as 'documents' | 'standard_info')}
          className="px-3 py-2 border rounded-md"
        >
          <option value="documents">文档</option>
          <option value="standard_info">标准信息</option>
        </select>
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || searching}
          className="flex items-center space-x-2"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span>搜索</span>
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <div className="text-sm">{error}</div>
        </Alert>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            找到 {results.length} 个相关结果
          </h3>
          {results.map((result, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    {result.document_title || '未命名文档'}
                  </h4>
                  <span className="text-xs text-gray-500">
                    相似度: {(result.similarity * 100).toFixed(1)}%
                  </span>
                </div>
                {result.project_name && (
                  <p className="text-xs text-gray-600">项目: {result.project_name}</p>
                )}
                {result.category && (
                  <p className="text-xs text-gray-600">分类: {result.category}</p>
                )}
                <p className="text-sm text-gray-700 line-clamp-3">
                  {result.content}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// 智能推荐组件
interface SmartRecommendationsProps {
  content: string
  onRecommendations?: (recommendations: SearchResult[]) => void
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({ 
  content, 
  onRecommendations 
}) => {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getRecommendations = async () => {
    if (!content.trim() || !user) return

    setLoading(true)
    setError(null)

    try {
      const results = await standardInfoRagService.getSmartRecommendations(content, user.id)
      const formattedResults = results.map((result: any) => ({
        id: result.id,
        content: result.content,
        similarity: result.similarity,
        category: result.category,
        document_title: result.title
      }))
      
      setRecommendations(formattedResults)
      onRecommendations?.(formattedResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取推荐失败')
    } finally {
      setLoading(false)
    }
  }

  // 当内容变化时自动获取推荐
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (content.trim().length > 50) { // 内容超过50个字符才推荐
        getRecommendations()
      }
    }, 1000) // 防抖1秒

    return () => clearTimeout(timeoutId)
  }, [content])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <div className="text-sm">{error}</div>
      </Alert>
    )
  }

  if (recommendations.length === 0) {
    return null // 没有推荐时不显示
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">智能推荐</h3>
      {recommendations.map((recommendation, index) => (
        <Card key={index} className="p-3 border-l-4 border-blue-400">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                {recommendation.document_title}
              </h4>
              <span className="text-xs text-gray-500">
                相关度: {(recommendation.similarity * 100).toFixed(1)}%
              </span>
            </div>
            {recommendation.category && (
              <p className="text-xs text-blue-600">{recommendation.category}</p>
            )}
            <p className="text-xs text-gray-600 line-clamp-2">
              {recommendation.content}
            </p>
          </div>
        </Card>
      ))}
    </div>
  )
}