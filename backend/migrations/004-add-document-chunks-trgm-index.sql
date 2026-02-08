CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_document_chunks_content_trgm
ON document_chunks USING GIN (content gin_trgm_ops);
