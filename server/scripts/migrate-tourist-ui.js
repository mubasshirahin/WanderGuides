import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

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

const statements = [
  // Keep the guide directory and guide account connected on existing databases.
  `IF COL_LENGTH('Guides', 'UserID') IS NULL ALTER TABLE Guides ADD UserID INT NULL`,
  `IF COL_LENGTH('Guides', 'HourlyRate') IS NULL ALTER TABLE Guides ADD HourlyRate DECIMAL(10,2) NULL`,
  `IF COL_LENGTH('Guides', 'DailyRate') IS NULL ALTER TABLE Guides ADD DailyRate DECIMAL(10,2) NULL`,
  `IF COL_LENGTH('Guides', 'TotalReviews') IS NULL ALTER TABLE Guides ADD TotalReviews INT NOT NULL CONSTRAINT DF_Guides_TotalReviews_UI DEFAULT 0`,
  `UPDATE Guides SET DailyRate = RatePerDay WHERE DailyRate IS NULL`,
  `UPDATE g SET g.UserID = u.Id FROM Guides g INNER JOIN Users u ON u.Email = g.Email AND u.Role = 'guide' WHERE g.UserID IS NULL`,
  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Guides_UserID' AND object_id = OBJECT_ID('Guides')) CREATE UNIQUE INDEX UQ_Guides_UserID ON Guides(UserID) WHERE UserID IS NOT NULL`,

  // Tour browse queries and package cards expect these optional fields.
  `IF COL_LENGTH('GuideTours', 'Category') IS NULL ALTER TABLE GuideTours ADD Category NVARCHAR(100) NULL`,
  `IF COL_LENGTH('GuideTours', 'Difficulty') IS NULL ALTER TABLE GuideTours ADD Difficulty NVARCHAR(50) NULL`,
  `IF COL_LENGTH('GuideTours', 'MeetingPoint') IS NULL ALTER TABLE GuideTours ADD MeetingPoint NVARCHAR(255) NULL`,
  `IF COL_LENGTH('GuideTours', 'Included') IS NULL ALTER TABLE GuideTours ADD Included NVARCHAR(MAX) NULL`,
  `IF COL_LENGTH('GuideTours', 'Highlights') IS NULL ALTER TABLE GuideTours ADD Highlights NVARCHAR(MAX) NULL`,
  `IF COL_LENGTH('GuideTours', 'Languages') IS NULL ALTER TABLE GuideTours ADD Languages NVARCHAR(255) NULL`,

  // Guides can leave a review for tourists after a completed booking.
  `IF OBJECT_ID('GuideReviewsOfTourists', 'U') IS NULL
   CREATE TABLE GuideReviewsOfTourists (
     ReviewID INT IDENTITY PRIMARY KEY,
     GuideID INT NOT NULL,
     TouristID INT NOT NULL,
     BookingID INT NOT NULL,
     Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
     Comment NVARCHAR(MAX) NULL,
     CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
     CONSTRAINT FK_GRoT_Guide_UI FOREIGN KEY (GuideID) REFERENCES Users(Id),
     CONSTRAINT FK_GRoT_Tourist_UI FOREIGN KEY (TouristID) REFERENCES Users(Id),
     CONSTRAINT FK_GRoT_Booking_UI FOREIGN KEY (BookingID) REFERENCES Bookings(Id),
     CONSTRAINT UQ_GRoT_Booking_UI UNIQUE (BookingID)
   )`,
  `IF OBJECT_ID('GuideReviewsOfTourists', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GRoT_Tourist_UI' AND object_id = OBJECT_ID('GuideReviewsOfTourists')) CREATE INDEX IX_GRoT_Tourist_UI ON GuideReviewsOfTourists(TouristID)`,
];

async function run() {
  let pool;
  try {
    pool = await sql.connect(config);
    for (const statement of statements) {
      await pool.request().query(statement);
    }
    console.log('[migration] Tourist profile, tour package, and guide directory schema is up to date.');
  } catch (error) {
    console.error('[migration] Failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (pool) await pool.close();
  }
}

run();
