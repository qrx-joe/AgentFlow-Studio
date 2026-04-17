import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

const buildStatsSql = `
  CREATE TABLE IF NOT EXISTS rag_term_stats (
    term TEXT PRIMARY KEY,
    df INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  TRUNCATE rag_term_stats;
  INSERT INTO rag_term_stats (term, df, updated_at)
  SELECT lexeme, COUNT(*)::int, CURRENT_TIMESTAMP
  FROM (
    SELECT id, unnest(tsvector_to_array(to_tsvector('simple', content))) AS lexeme
    FROM document_chunks
  ) AS terms
  GROUP BY lexeme;
`;

try {
  await client.connect();
  await client.query(buildStatsSql);
  console.log('BM25 term stats rebuilt');
} catch (error) {
  console.error('Failed to rebuild term stats', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
