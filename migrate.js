/**
 * Run this script to initialize the Postgres database schema on Vercel.
 * Usage: DATABASE_URL="<your-vercel-postgres-url>" node migrate.js
 */
require('dotenv').config({ path: './scheduler-backend/.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('❌ No DATABASE_URL or POSTGRES_URL found. Set it in .env or pass as env variable.');
  process.exit(1);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const schemaPath = path.join(__dirname, 'scheduler-backend/src/db/schema.postgres.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

(async () => {
  const client = await pool.connect();
  try {
    console.log('🔗 Connected to Postgres database');
    console.log('📦 Running schema migration...');
    await client.query(schema);
    console.log('✅ Schema applied successfully! Tables created:');

    const tables = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    tables.rows.forEach(r => console.log('  -', r.tablename));
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
