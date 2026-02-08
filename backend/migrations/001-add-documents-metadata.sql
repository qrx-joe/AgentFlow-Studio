-- 为 documents 表新增 metadata 字段（兼容已有数据）
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
