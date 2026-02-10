const { Client } = require('pg');
const fs = require('fs');

let connectionString = process.env.DATABASE_URL;

if (!connectionString && fs.existsSync('.env')) {
    const envConfig = fs.readFileSync('.env', 'utf8');
    const match = envConfig.match(/DATABASE_URL=(.*)/);
    if (match) {
        connectionString = match[1].trim();
    }
}

if (!connectionString) {
    console.error('DATABASE_URL not found in environment or .env file');
    process.exit(1);
}

// Mask password for logging
const maskedString = connectionString.replace(/:([^:@]+)@/, ':****@');
console.log('Testing connection to:', maskedString);

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

client.connect()
    .then(() => {
        console.log('Connected successfully!');
        return client.query('SELECT NOW() as now');
    })
    .then(res => {
        console.log('Server time:', res.rows[0].now);
        return client.end();
    })
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });
