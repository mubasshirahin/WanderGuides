import fs from 'node:fs';
import path from 'node:path';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Run db/views.sql + procedures.sql + triggers.sql in order.
// Usage: npm run migrate:db-objects   (from server/ folder)
const server = process.env.DB_SERVER || 'localhost';
const hasInstance = server.includes('\\') || server.includes('/');
const config = {
  server,
  ...(hasInstance || !process.env.DB_PORT ? {} : { port: Number(process.env.DB_PORT) }),
  database: process.env.DB_NAME || 'TouristGuide',
  ...(process.env.DB_USE_WINDOWS_AUTH === 'true'
    ? {}
    : { user: process.env.DB_USER || 'sa', password: process.env.DB_PASSWORD || '' }),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    enableArithAbort: true,
  },
};

const files = ['views.sql', 'procedures.sql', 'triggers.sql'];

function splitBatches(text) {
  // CREATE VIEW/PROC/TRIGGER must be first in batch -> split on GO lines
  return text
    .split(/^\s*GO\s*$/gim)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function run() {
  const dbDir = path.join(process.cwd(), '..', 'db');
  let pool;
  try {
    pool = await sql.connect(config);
    for (const file of files) {
      const full = path.join(dbDir, file);
      if (!fs.existsSync(full)) {
        console.log(`[db-objects] skip (not found): ${file}`);
        continue;
      }
      const batches = splitBatches(fs.readFileSync(full, 'utf8'));
      for (const batch of batches) {
        await pool.request().query(batch);
      }
      console.log(`[db-objects] applied: ${file} (${batches.length} batches)`);
    }
    console.log('[db-objects] Views + Procedures + Triggers up to date.');
  } catch (err) {
    console.error('[db-objects] Failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (pool) await pool.close();
  }
}

run();
