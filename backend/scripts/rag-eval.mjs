import fs from 'fs';

const args = process.argv.slice(2);
const fileArgIndex = args.findIndex((arg) => arg === '--file');
const urlArgIndex = args.findIndex((arg) => arg === '--url');

const filePath = fileArgIndex >= 0 ? args[fileArgIndex + 1] : 'scripts/rag-eval.json';
const baseUrl = urlArgIndex >= 0 ? args[urlArgIndex + 1] : 'http://localhost:3000';

if (!filePath) {
  console.error('Missing --file path');
  process.exit(1);
}

const raw = fs.readFileSync(filePath, 'utf-8');
const payload = JSON.parse(raw);
const queries = Array.isArray(payload?.queries) ? payload.queries : [];

if (queries.length === 0) {
  console.error('No queries found in file');
  process.exit(1);
}

const topKDefault = Number(payload?.topK || 3);

let hitCount = 0;
let mrrTotal = 0;
let evaluated = 0;

for (const item of queries) {
  const query = item.query;
  const expected = Array.isArray(item.expectedDocumentIds) ? item.expectedDocumentIds : [];
  if (!query || expected.length === 0) {
    continue;
  }

  const body = {
    query,
    topK: item.topK || topKDefault,
    scoreThreshold: item.scoreThreshold,
    hybrid: item.hybrid,
    rerank: item.rerank,
    vectorWeight: item.vectorWeight,
    keywordWeight: item.keywordWeight,
    keywordMode: item.keywordMode,
  };

  const res = await fetch(`${baseUrl}/api/knowledge/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`Query failed: ${query} (${res.status})`);
    continue;
  }

  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  const docIds = results.map((row) => row.documentId);
  const hitIndex = docIds.findIndex((id) => expected.includes(id));

  evaluated += 1;
  if (hitIndex >= 0) {
    hitCount += 1;
    mrrTotal += 1 / (hitIndex + 1);
  }
}

const hitRate = evaluated ? hitCount / evaluated : 0;
const mrr = evaluated ? mrrTotal / evaluated : 0;

console.log('RAG eval summary');
console.log(`Queries evaluated: ${evaluated}`);
console.log(`Hit@K: ${hitRate.toFixed(4)}`);
console.log(`MRR: ${mrr.toFixed(4)}`);
