const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually parse .env for DATABASE_URL
let connectionString = process.env.DATABASE_URL;
if (!connectionString && fs.existsSync('.env')) {
  const envConfig = fs.readFileSync('.env', 'utf8');
  const match = envConfig.match(/DATABASE_URL=(.*)/);
  if (match) {
    connectionString = match[1].trim();
  }
}

if (!connectionString) {
  console.error('DATABASE_URL not found.');
  process.exit(1);
}

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  try {
    await client.connect();
    console.log('Connected to database.');

    const sqlPath = path.join(__dirname, 'database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing database.sql...');
    await client.query(sql);
    console.log('Database initialized successfully!');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await client.end();
  }
}

initDb();
