-- RAG系统相关函数

-- 文档相似度搜索函数
CREATE OR REPLACE FUNCTION search_similar_documents(
    query_embedding VECTOR(1536),
    query_user_id UUID,
    match_limit INTEGER DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    chunk_index INTEGER,
    similarity FLOAT,
    document_title VARCHAR(255),
    project_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.document_id,
        dc.content,
        dc.chunk_index,
        1 - (dc.embedding <=> query_embedding) AS similarity,
        d.title AS document_title,
        p.name AS project_name
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    JOIN projects p ON p.id = d.project_id
    WHERE p.user_id = query_user_id
        AND d.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND (1 - (dc.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- 标准信息相似度搜索函数
CREATE OR REPLACE FUNCTION search_similar_standard_info(
    query_embedding VECTOR(1536),
    query_user_id UUID,
    query_category VARCHAR(100) DEFAULT NULL,
    match_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    category VARCHAR(100),
    title VARCHAR(255),
    content TEXT,
    tags TEXT[],
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.id,
        si.category,
        si.title,
        si.content,
        si.tags,
        1 - (si.embedding <=> query_embedding) AS similarity
    FROM standard_info si
    WHERE si.user_id = query_user_id
        AND si.deleted_at IS NULL
        AND (query_category IS NULL OR si.category = query_category)
        AND si.embedding IS NOT NULL
    ORDER BY si.embedding <=> query_embedding
    LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- 智能推荐函数
CREATE OR REPLACE FUNCTION get_smart_recommendations(
    content_embedding VECTOR(1536),
    query_user_id UUID,
    match_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    category VARCHAR(100),
    title VARCHAR(255),
    content TEXT,
    tags TEXT[],
    similarity FLOAT,
    recommendation_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.id,
        si.category,
        si.title,
        si.content,
        si.tags,
        1 - (si.embedding <=> content_embedding) AS similarity,
        CASE 
            WHEN si.category = '产品相关' THEN '基于产品内容推荐'
            WHEN si.category = '价格策略' THEN '基于价格策略推荐'
            WHEN si.category = '目标用户' THEN '基于用户画像推荐'
            ELSE '基于内容相似度推荐'
        END AS recommendation_reason
    FROM standard_info si
    WHERE si.user_id = query_user_id
        AND si.deleted_at IS NULL
        AND si.embedding IS NOT NULL
    ORDER BY si.embedding <=> content_embedding
    LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- 添加向量列到标准信息表
ALTER TABLE standard_info 
ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

-- 创建标准信息向量索引
CREATE INDEX IF NOT EXISTS idx_standard_info_embedding ON standard_info 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 创建全文搜索索引（用于混合搜索）
CREATE INDEX IF NOT EXISTS idx_documents_content_fts ON documents 
USING gin(to_tsvector('chinese', content));

CREATE INDEX IF NOT EXISTS idx_standard_info_content_fts ON standard_info 
USING gin(to_tsvector('chinese', content));

-- 创建混合搜索函数（向量和全文搜索）
CREATE OR REPLACE FUNCTION hybrid_search_documents(
    query_text TEXT,
    query_embedding VECTOR(1536),
    query_user_id UUID,
    match_limit INTEGER DEFAULT 5,
    vector_weight FLOAT DEFAULT 0.7,
    text_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    chunk_index INTEGER,
    combined_score FLOAT,
    document_title VARCHAR(255),
    project_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.document_id,
        dc.content,
        dc.chunk_index,
        (vector_weight * (1 - (dc.embedding <=> query_embedding))) + 
        (text_weight * ts_rank(to_tsvector('chinese', dc.content), plainto_tsquery('chinese', query_text))) AS combined_score,
        d.title AS document_title,
        p.name AS project_name
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    JOIN projects p ON p.id = d.project_id
    WHERE p.user_id = query_user_id
        AND d.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND dc.embedding IS NOT NULL
    ORDER BY combined_score DESC
    LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;