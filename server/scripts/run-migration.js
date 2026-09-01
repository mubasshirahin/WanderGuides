import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'TouristGuide',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
  },
};

const statements = [
  `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'Provider')
   ALTER TABLE Users ADD Provider NVARCHAR(20) NOT NULL DEFAULT 'local'`,

  `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'ProviderId')
   ALTER TABLE Users ADD ProviderId NVARCHAR(255) NULL`,

  `IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'PasswordHash' AND is_nullable = 0)
   ALTER TABLE Users ALTER COLUMN PasswordHash NVARCHAR(255) NULL`,

  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_ProviderId' AND object_id = OBJECT_ID('Users'))
   CREATE UNIQUE INDEX IX_Users_ProviderId ON Users(ProviderId) WHERE ProviderId IS NOT NULL`,
];

async function runMigration() {
  const pool = await sql.connect(config);
  for (const stmt of statements) {
    try {
      await pool.request().query(stmt);
      console.log('[migration] OK:', stmt.substring(0, 60) + '...');
    } catch (err) {
      console.error('[migration] Error:', err.message);
    }
  }
  console.log('[migration] Done!');
  await pool.close();
  process.exit(0);
}

runMigration();
