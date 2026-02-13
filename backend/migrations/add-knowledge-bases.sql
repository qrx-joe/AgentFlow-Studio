-- 创建知识库表
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 为 documents 表添加 knowledge_base_id 列
ALTER TABLE documents ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;

-- 添加外键约束（可选）
-- ALTER TABLE documents ADD CONSTRAINT fk_documents_knowledge_base
--   FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_documents_knowledge_base_id ON documents(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_created_at ON knowledge_bases(created_at);
