const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

let dbPromise;

const initDb = async () => {
  if (!dbPromise) {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../../scheduler-database.sqlite');
    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    const db = await dbPromise;
    await db.exec('PRAGMA journal_mode = WAL;');
    await db.exec('PRAGMA foreign_keys = ON;');
    
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.exec(schema);
  }
  return dbPromise;
};

const query = async (text, params = []) => {
  const db = await initDb();
  
  let sqliteText = text.replace(/\$\d+/g, '?');
  sqliteText = sqliteText.replace(/NOW\(\)/gi, "datetime('now')");
  // Replace ILIKE with LIKE for SQLite
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
  return {
    query: query,
    release: () => {}
  }
};

module.exports = { query, getClient, pool: { on: () => {} } };
