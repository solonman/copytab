import { supabase } from './supabaseClient'

// RAG服务 - 文档处理、向量化、检索
export const ragService = {
  // 文档分块处理
  async chunkDocument(documentId: string, content: string, chunkSize = 1000, chunkOverlap = 200) {
    const chunks = []
    let start = 0
    
    while (start < content.length) {
      let end = start + chunkSize
      
      // 如果这不是最后一个块，尝试在句子边界处分割
      if (end < content.length) {
        const lastPeriod = content.lastIndexOf('.', end)
        const lastNewline = content.lastIndexOf('\n', end)
        const lastSpace = content.lastIndexOf(' ', end)
        
        const bestBreak = Math.max(lastPeriod, lastNewline, lastSpace)
        if (bestBreak > start) {
          end = bestBreak + 1
        }
      }
      
      const chunk = content.slice(start, end).trim()
      if (chunk) {
        chunks.push({
          document_id: documentId,
          content: chunk,
          chunk_index: chunks.length,
          metadata: {
            start_index: start,
            end_index: end,
            chunk_size: chunk.length
          }
        })
      }
      
      start = end - chunkOverlap
      if (start >= end) break // 防止无限循环
    }
    
    return chunks
  },

  // 生成文本向量（使用OpenAI嵌入）
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
          encoding_format: 'float'
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      return data.data[0].embedding
    } catch (error) {
      console.error('生成向量失败:', error)
      throw error
    }
  },

  // 存储文档分块到数据库
  async storeDocumentChunks(documentId: string, content: string) {
    try {
      // 1. 删除现有分块
      const { error: deleteError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId)

      if (deleteError) throw deleteError

      // 2. 分块处理
      const chunks = await this.chunkDocument(documentId, content)
      
      // 3. 为每个分块生成向量并存储
      const chunkData = []
      for (const chunk of chunks) {
        try {
          const embedding = await this.generateEmbedding(chunk.content)
          chunkData.push({
            ...chunk,
            embedding
          })
        } catch (error) {
          console.error(`分块 ${chunk.chunk_index} 向量生成失败:`, error)
          // 继续处理其他分块
        }
      }

      if (chunkData.length === 0) {
        throw new Error('没有成功生成任何向量')
      }

      // 4. 批量插入分块数据
      const { error: insertError } = await supabase
        .from('document_chunks')
        .insert(chunkData)

      if (insertError) throw insertError

      return {
        success: true,
        chunksProcessed: chunkData.length
      }
    } catch (error) {
      console.error('存储文档分块失败:', error)
      throw error
    }
  },

  // 向量相似度搜索
  async searchSimilarDocuments(query: string, userId: string, limit = 5, similarityThreshold = 0.7) {
    try {
      // 1. 生成查询向量
      const queryEmbedding = await this.generateEmbedding(query)
      
      // 2. 执行向量相似度搜索
      const { data, error } = await supabase
        .rpc('search_similar_documents', {
          query_embedding: queryEmbedding,
          query_user_id: userId,
          match_limit: limit,
          similarity_threshold: similarityThreshold
        })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('相似度搜索失败:', error)
      throw error
    }
  },

  // 获取文档的所有分块
  async getDocumentChunks(documentId: string) {
    const { data, error } = await supabase
      .from('document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true })

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
  },

  // 更新文档内容并重新分块
  async updateDocumentWithChunks(documentId: string, newContent: string) {
    try {
      // 1. 更新文档内容
      const { error: updateError } = await supabase
        .from('documents')
        .update({ 
          content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (updateError) throw updateError

      // 2. 重新分块和向量化
      const result = await this.storeDocumentChunks(documentId, newContent)
      
      return result
    } catch (error) {
      console.error('更新文档分块失败:', error)
      throw error
    }
  },

  // 批量处理多个文档
  async processMultipleDocuments(documentIds: string[]) {
    const results = []
    
    for (const documentId of documentIds) {
      try {
        // 获取文档内容
        const { data: document } = await supabase
          .from('documents')
          .select('content')
          .eq('id', documentId)
          .single()

        if (document && document.content) {
          const result = await this.storeDocumentChunks(documentId, document.content)
          results.push({
            documentId,
            success: true,
            chunksProcessed: result.chunksProcessed
          })
        }
      } catch (error) {
        results.push({
          documentId,
          success: false,
          error: error.message
        })
      }
    }

    return results
  }
}

// 标准信息RAG服务
export const standardInfoRagService = {
  // 搜索相似的标准信息
  async searchSimilarStandardInfo(query: string, userId: string, category?: string, limit = 5) {
    try {
      // 1. 生成查询向量
      const queryEmbedding = await ragService.generateEmbedding(query)
      
      // 2. 执行向量搜索
      const { data, error } = await supabase
        .rpc('search_similar_standard_info', {
          query_embedding: queryEmbedding,
          query_user_id: userId,
          query_category: category,
          match_limit: limit
        })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('搜索标准信息失败:', error)
      throw error
    }
  },

  // 智能推荐相关内容
  async getSmartRecommendations(content: string, userId: string, limit = 3) {
    try {
      // 1. 生成内容向量
      const contentEmbedding = await ragService.generateEmbedding(content)
      
      // 2. 获取推荐的标准信息
      const { data, error } = await supabase
        .rpc('get_smart_recommendations', {
          content_embedding: contentEmbedding,
          query_user_id: userId,
          match_limit: limit
        })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('获取智能推荐失败:', error)
      throw error
    }
  }
}