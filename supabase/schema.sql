-- CopyTab数据库初始化脚本
-- 版本1.0.0

-- 启用必要扩展
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 创建项目表
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 创建文档表
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 创建标准信息表（知识库）
CREATE TABLE IF NOT EXISTS standard_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 创建文档分块表（用于RAG）
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- OpenAI text-embedding-3-small维度
    chunk_index INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建分享文档表
CREATE TABLE IF NOT EXISTS shared_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    permissions VARCHAR(50) NOT NULL DEFAULT 'read', -- read, write, comment
    expires_at TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建用户配置表
CREATE TABLE IF NOT EXISTS user_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_standard_info_user_id ON standard_info(user_id);
CREATE INDEX IF NOT EXISTS idx_standard_info_category ON standard_info(category);
CREATE INDEX IF NOT EXISTS idx_standard_info_deleted_at ON standard_info(deleted_at);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_shared_documents_document_id ON shared_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_shared_documents_token ON shared_documents(share_token);
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);

-- 创建向量索引（用于相似度搜索）
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 创建更新时间的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为相关表创建更新时间触发器
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_standard_info_updated_at 
    BEFORE UPDATE ON standard_info 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_documents_updated_at 
    BEFORE UPDATE ON shared_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_configs_updated_at 
    BEFORE UPDATE ON user_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建行级安全策略（RLS）
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;

-- 项目表的RLS策略
CREATE POLICY "用户只能查看自己的项目" ON projects
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- 文档表的RLS策略
CREATE POLICY "用户只能查看自己项目中的文档" ON documents
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = documents.project_id 
        AND projects.user_id = auth.uid()
        AND projects.deleted_at IS NULL
    ));

-- 标准信息表的RLS策略
CREATE POLICY "用户只能管理自己的标准信息" ON standard_info
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- 文档分块表的RLS策略
CREATE POLICY "用户只能查看自己文档的分块" ON document_chunks
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM documents 
        JOIN projects ON projects.id = documents.project_id
        WHERE documents.id = document_chunks.document_id 
        AND projects.user_id = auth.uid()
        AND documents.deleted_at IS NULL
        AND projects.deleted_at IS NULL
    ));

-- 分享文档表的RLS策略（公开读取）
CREATE POLICY "任何人都可以查看分享文档" ON shared_documents
    FOR SELECT TO anon, authenticated
    USING (expires_at IS NULL OR expires_at > NOW());

CREATE POLICY "用户只能管理自己文档的分享" ON shared_documents
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM documents 
        JOIN projects ON projects.id = documents.project_id
        WHERE documents.id = shared_documents.document_id 
        AND projects.user_id = auth.uid()
        AND documents.deleted_at IS NULL
        AND projects.deleted_at IS NULL
    ));

-- 用户配置表的RLS策略
CREATE POLICY "用户只能管理自己的配置" ON user_configs
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- 插入默认数据（可选）
INSERT INTO standard_info (user_id, category, title, content, tags) VALUES
    ('00000000-0000-0000-0000-000000000000', '示例', '欢迎使用CopyTab', '这是CopyTab智能写作工具的示例标准信息。您可以在这里管理您的产品描述、价格策略、目标用户等标准信息，用于智能补全功能。', '{"示例", "欢迎"}'),
    ('00000000-0000-0000-0000-000000000000', '产品相关', '产品核心卖点', 'CopyTab是一款AI驱动的广告文案写作工具，提供智能补全、知识库管理、项目管理等核心功能。', '{"产品", "核心卖点"}'),
    ('00000000-0000-0000-0000-000000000000', '产品相关', '定价策略说明', '我们提供基础版、专业版和企业版三个版本，满足不同用户的需求。基础版免费，专业版按月订阅，企业版按需定制。', '{"定价", "策略"}')
ON CONFLICT DO NOTHING;

-- 创建向量相似度搜索函数
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    document_id UUID,
    content TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.document_id,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE EXISTS (
        SELECT 1 FROM documents d
        JOIN projects p ON p.id = d.project_id
        WHERE d.id = dc.document_id 
        AND d.deleted_at IS NULL
        AND p.deleted_at IS NULL
    )
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 创建标准信息搜索函数
CREATE OR REPLACE FUNCTION search_standard_info(
    user_id UUID,
    search_query TEXT,
    search_category TEXT DEFAULT NULL,
    match_limit INT DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    category VARCHAR,
    title VARCHAR,
    content TEXT,
    tags TEXT[],
    relevance FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.id,
        si.category,
        si.title,
        si.content,
        si.tags,
        CASE 
            WHEN search_query IS NULL OR search_query = '' THEN 1.0
            ELSE ts_rank(
                to_tsvector('simple', si.title || ' ' || si.content),
                plainto_tsquery('simple', search_query)
            )
        END AS relevance
    FROM standard_info si
    WHERE si.user_id = search_standard_info.user_id
    AND si.deleted_at IS NULL
    AND (search_category IS NULL OR si.category = search_category)
    AND (
        search_query IS NULL OR search_query = '' OR
        to_tsvector('simple', si.title || ' ' || si.content) @@ plainto_tsquery('simple', search_query)
    )
    ORDER BY relevance DESC, si.updated_at DESC
    LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;