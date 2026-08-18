import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const SERVER = process.env.DB_SERVER || 'localhost';

/**
 * MS SQL Server connection pool — no ORM, raw mssql driver.
 * Supports both SQL login and Windows authentication.
 */
function buildConfig() {
  const isWindowsAuth = process.env.DB_USE_WINDOWS_AUTH === 'true';
  // Named instances like "localhost\SQLEXPRESS" resolve their own dynamic port
  // via the SQL Browser service, so an explicit port must be omitted.
  const hasInstance = SERVER.includes('\\') || SERVER.includes('/');

  const base = {
    server: SERVER,
    database: process.env.DB_NAME || 'TouristGuide',
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
      enableArithAbort: true,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  };

  if (!hasInstance && process.env.DB_PORT) base.port = Number(process.env.DB_PORT);

  if (isWindowsAuth) {
    // Integrated security — authenticate as the OS user (no user/password).
    return base;
  }
  return {
    ...base,
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
  };
}

let poolPromiseCache = null;

/** Lazily connect (or reconnect after a failure) and cache the pool. */
async function getPool() {
  if (!poolPromiseCache) {
    poolPromiseCache = sql.connect(buildConfig())
      .then((pool) => {
        console.log('[db] Connected to MS SQL Server:', process.env.DB_NAME || 'TouristGuide');
        return pool;
      })
      .catch((err) => {
        console.error('[db] MS SQL Server connection failed:', err.message);
        poolPromiseCache = null; // allow a retry on the next call
        throw err;
      });
  }
  return poolPromiseCache;
}

/** Run a parameterized SQL query with the shared pool. */
export async function query(sqlString, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  const result = await request.query(sqlString);
  return result.recordset;
}

/** Simple health probe: SELECT 1. */
export async function checkConnection() {
  const pool = await getPool();
  await pool.request().query('SELECT 1');
  return true;
}

export default sql;