const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let dbPromise;
let pgPool;

// Detect if we should use Postgres (Vercel uses POSTGRES_URL)
const isPostgres = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);

if (isPostgres) {
  console.log('📡 Database: Running in POSTGRES mode');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false // Required for Vercel/Neon Postgres
    }
  });
} else {
  // Only load SQLite packages in local/non-serverless environments
  console.log('📦 Database: Running in SQLITE mode');
}

const initDb = async () => {
  if (isPostgres) return null; // No init needed for pgPool

  if (!dbPromise) {
    // Lazy-load sqlite packages so they are never touched in Postgres/Vercel mode
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../../scheduler-database.sqlite');
    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    const db = await dbPromise;
    await db.exec('PRAGMA journal_mode = WAL;');
    await db.exec('PRAGMA foreign_keys = ON;');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await db.exec(schema);
    }
  }
  return dbPromise;
};

const query = async (text, params = []) => {
  if (isPostgres) {
    const res = await pgPool.query(text, params);
    return res;
  }

  const db = await initDb();
  
  // Adapt Postgres-style $1, $2 to SQLite-style ?
  let sqliteText = text.replace(/\$\d+/g, '?');
  sqliteText = sqliteText.replace(/NOW\(\)/gi, "datetime('now')");
  // Convert "datetime('now') - INTERVAL 'N unit'" to SQLite modifier syntax
  sqliteText = sqliteText.replace(/datetime\('now'\)\s*-\s*INTERVAL\s+'(\d+)\s+(\w+)'/gi, (_, n, unit) => `datetime('now', '-${n} ${unit}')`);
  sqliteText = sqliteText.replace(/ILIKE/gi, "LIKE");

  const cleanParams = params.map(p => p === undefined ? null : p);
  const isSelect = /^\s*(SELECT|WITH|PRAGMA)/i.test(sqliteText) || /RETURNING/i.test(sqliteText);
  
  try {
    if (isSelect) {
      const rows = await db.all(sqliteText, cleanParams);
      return { rows, rowCount: rows.length };
    } else {
      const result = await db.run(sqliteText, cleanParams);
      return { rows: [], rowCount: result.changes };
    }
  } catch (err) {
    console.error('Database query error:', err.message, sqliteText, params);
    throw err;
  }
};

const getClient = async () => {
  if (isPostgres) {
    return pgPool.connect();
  }
  return {
    query: query,
    release: () => {}
  }
};

module.exports = { 
  query, 
  getClient, 
  pool: isPostgres ? pgPool : { on: () => {} } 
};
