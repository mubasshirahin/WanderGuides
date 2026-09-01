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
  // Create GuideAvailability table if it doesn't exist
  `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'GuideAvailability')
   CREATE TABLE GuideAvailability (
     Id          INT IDENTITY PRIMARY KEY,
     GuideId     INT NOT NULL,
     BlockedDate DATE NOT NULL,
     Reason      NVARCHAR(255) NULL DEFAULT 'Blocked',
     CreatedAt   DATETIME2 DEFAULT SYSUTCDATETIME(),
     CONSTRAINT FK_GuideAvailability_Guide FOREIGN KEY (GuideId) REFERENCES Users(Id),
     CONSTRAINT UQ_GuideAvailability_Date   UNIQUE (GuideId, BlockedDate)
   )`,

  // Index for fast lookups by guide
  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GuideAvailability_GuideId' AND object_id = OBJECT_ID('GuideAvailability'))
   CREATE INDEX IX_GuideAvailability_GuideId ON GuideAvailability(GuideId)`,
];

async function run() {
  const pool = await sql.connect(config);
  for (const stmt of statements) {
    try {
      await pool.request().query(stmt);
      console.log('[migration] OK:', stmt.replace(/\s+/g, ' ').substring(0, 70) + '...');
    } catch (err) {
      console.error('[migration] Error on statement:', stmt.replace(/\s+/g, ' ').substring(0, 70));
      console.error('  ', err.message);
    }
  }
  console.log('[migration] Done!');
  await pool.close();
  process.exit(0);
}

run();
