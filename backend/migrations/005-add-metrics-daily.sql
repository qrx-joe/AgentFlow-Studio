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
