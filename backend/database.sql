-- ========================================
-- AgentFlow Studio 数据库初始化脚本
-- ========================================

-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;
-- 启用 pg_trgm 扩展（关键词检索加速）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ========================================
-- 工作流表
-- ========================================
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 知识库文档表
-- ========================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(255),
    file_size INTEGER,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 文档块表 (用于 RAG)
-- ========================================
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding VECTOR(1024),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建向量索引 (使用 IVFFlat 算法)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- 创建普通索引
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id 
ON document_chunks(document_id);

-- 创建全文索引（关键词检索）
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_tsv
ON document_chunks USING GIN (to_tsvector('simple', content));

-- 创建 trigram 索引（ILIKE 查询加速）
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_trgm
ON document_chunks USING GIN (content gin_trgm_ops);

-- 关键词统计表（BM25 预计算）
CREATE TABLE IF NOT EXISTS rag_term_stats (
    term TEXT PRIMARY KEY,
    df INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 指标汇总表（每日）
CREATE TABLE IF NOT EXISTS metrics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    workflow_total INT NOT NULL DEFAULT 0,
    workflow_failed INT NOT NULL DEFAULT 0,
    workflow_duration_ms BIGINT NOT NULL DEFAULT 0,
    knowledge_total INT NOT NULL DEFAULT 0,
    knowledge_duration_ms BIGINT NOT NULL DEFAULT 0,
    rag_cache_hits INT NOT NULL DEFAULT 0,
    rag_cache_misses INT NOT NULL DEFAULT 0
);

-- ========================================
-- 会话表
-- ========================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    workflow_id UUID REFERENCES workflows(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 消息表
-- ========================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id 
ON chat_messages(session_id);

-- ========================================
-- 工作流执行日志表
-- ========================================
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    input JSONB,
    output JSONB,
    logs JSONB DEFAULT '[]',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id 
ON workflow_executions(workflow_id);

-- ========================================
-- 示例数据 (可选)
-- ========================================
-- 插入一个示例工作流
INSERT INTO workflows (name, description, nodes, edges) VALUES (
    '智能问答工作流',
    '基础的 RAG 问答工作流示例',
    '[
        {"id": "trigger-1", "type": "trigger", "position": {"x": 100, "y": 200}, "data": {"label": "开始"}},
        {"id": "knowledge-1", "type": "knowledge", "position": {"x": 300, "y": 200}, "data": {"label": "知识检索", "topK": 3}},
        {"id": "llm-1", "type": "llm", "position": {"x": 500, "y": 200}, "data": {"label": "LLM", "model": "gpt-4o-mini"}},
        {"id": "end-1", "type": "end", "position": {"x": 700, "y": 200}, "data": {"label": "结束"}}
    ]',
    '[
        {"id": "e1", "source": "trigger-1", "target": "knowledge-1"},
        {"id": "e2", "source": "knowledge-1", "target": "llm-1"},
        {"id": "e3", "source": "llm-1", "target": "end-1"}
    ]'
) ON CONFLICT DO NOTHING;
