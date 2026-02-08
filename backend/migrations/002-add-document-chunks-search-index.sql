CREATE INDEX IF NOT EXISTS idx_document_chunks_content_tsv
ON document_chunks USING GIN (to_tsvector('simple', content));
