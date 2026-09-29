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
  `IF COL_LENGTH('GuideTours', 'ViewCount') IS NULL ALTER TABLE GuideTours ADD ViewCount INT NOT NULL CONSTRAINT DF_GuideTours_ViewCount_UI DEFAULT 0`,
  `IF COL_LENGTH('Reviews', 'GuideResponse') IS NULL ALTER TABLE Reviews ADD GuideResponse NVARCHAR(1000) NULL`,
  `IF COL_LENGTH('Reviews', 'GuideResponseAt') IS NULL ALTER TABLE Reviews ADD GuideResponseAt DATETIME2 NULL`,
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
  `IF COL_LENGTH('GuideTours', 'Itinerary') IS NULL ALTER TABLE GuideTours ADD Itinerary NVARCHAR(MAX) NULL`,
  `IF COL_LENGTH('GuideTours', 'Included') IS NULL ALTER TABLE GuideTours ADD Included NVARCHAR(MAX) NULL`,
  `IF COL_LENGTH('GuideTours', 'Highlights') IS NULL ALTER TABLE GuideTours ADD Highlights NVARCHAR(MAX) NULL`,
  `IF COL_LENGTH('GuideTours', 'Languages') IS NULL ALTER TABLE GuideTours ADD Languages NVARCHAR(255) NULL`,
  `IF COL_LENGTH('GuideTours', 'ImageUrl') IS NULL ALTER TABLE GuideTours ADD ImageUrl NVARCHAR(1000) NULL`,
  `IF COL_LENGTH('Bookings', 'PaymentStatus') IS NULL ALTER TABLE Bookings ADD PaymentStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_Bookings_PaymentStatus_UI DEFAULT 'unpaid'`,
  `IF COL_LENGTH('Bookings', 'TourId') IS NULL ALTER TABLE Bookings ADD TourId INT NULL`,
  `IF COL_LENGTH('Bookings', 'GroupSize') IS NULL ALTER TABLE Bookings ADD GroupSize INT NOT NULL CONSTRAINT DF_Bookings_GroupSize_UI DEFAULT 1`,
  `IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Bookings_GuideTours') ALTER TABLE Bookings ADD CONSTRAINT FK_Bookings_GuideTours FOREIGN KEY (TourId) REFERENCES GuideTours(Id)`,
  `IF OBJECT_ID('TouristFavorites', 'U') IS NULL
   CREATE TABLE TouristFavorites (
     Id INT IDENTITY PRIMARY KEY,
     TouristUserId INT NOT NULL,
     GuideTourId INT NOT NULL,
     CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
     CONSTRAINT FK_TouristFavorites_User_UI FOREIGN KEY (TouristUserId) REFERENCES Users(Id) ON DELETE CASCADE,
     CONSTRAINT FK_TouristFavorites_Tour_UI FOREIGN KEY (GuideTourId) REFERENCES GuideTours(Id) ON DELETE CASCADE,
     CONSTRAINT UQ_TouristFavorites_UserTour_UI UNIQUE (TouristUserId, GuideTourId)
   )`,
  `IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CHK_Bookings_PaymentStatus_UI')
   ALTER TABLE Bookings ADD CONSTRAINT CHK_Bookings_PaymentStatus_UI CHECK (PaymentStatus IN ('unpaid','paid','refunded'))`,
  `IF OBJECT_ID('TouristFavoriteGuides', 'U') IS NULL
   CREATE TABLE TouristFavoriteGuides (
     Id INT IDENTITY PRIMARY KEY,
     TouristUserId INT NOT NULL,
     GuideUserId INT NOT NULL,
     CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
     CONSTRAINT FK_TouristFavoriteGuides_Tourist_UI FOREIGN KEY (TouristUserId) REFERENCES Users(Id) ON DELETE CASCADE,
     CONSTRAINT FK_TouristFavoriteGuides_Guide_UI FOREIGN KEY (GuideUserId) REFERENCES Users(Id),
     CONSTRAINT UQ_TouristFavoriteGuides_Pair_UI UNIQUE (TouristUserId, GuideUserId)
   )`,
  `IF OBJECT_ID('TouristNotifications', 'U') IS NULL
   CREATE TABLE TouristNotifications (
     Id INT IDENTITY PRIMARY KEY,
     TouristUserId INT NOT NULL,
     Type NVARCHAR(40) NOT NULL,
     Title NVARCHAR(160) NOT NULL,
     Body NVARCHAR(500) NULL,
     LinkUrl NVARCHAR(300) NULL,
     IsRead BIT NOT NULL DEFAULT 0,
     CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
     CONSTRAINT FK_TouristNotifications_User_UI FOREIGN KEY (TouristUserId) REFERENCES Users(Id) ON DELETE CASCADE
   )`,
  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TouristNotifications_UserDate' AND object_id = OBJECT_ID('TouristNotifications')) CREATE INDEX IX_TouristNotifications_UserDate ON TouristNotifications(TouristUserId, CreatedAt DESC)`,

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
    for (const [index, statement] of statements.entries()) {
      try {
        await pool.request().query(statement);
      } catch (error) {
        const details = error.precedingErrors?.map((item) => item.message).filter(Boolean).join(' | ');
        console.error(`[migration] Statement ${index + 1}/${statements.length} failed:`, details || error.originalError?.info?.message || error.message);
        throw error;
      }
    }
    console.log('[migration] Tourist profiles, tour packages, guide directory, favorites, and payment status schema are up to date.');
  } catch (error) {
    console.error('[migration] Failed:', error.originalError?.info?.message || error.message);
    process.exitCode = 1;
  } finally {
    if (pool) await pool.close();
  }
}

run();
