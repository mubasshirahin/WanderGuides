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
  // Guides: user link + hourly/daily rates + review count
  `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Guides') AND name = 'UserID')
   ALTER TABLE Guides ADD UserID INT NULL`,

  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Guides_UserID' AND object_id = OBJECT_ID('Guides'))
   CREATE UNIQUE INDEX UQ_Guides_UserID ON Guides(UserID) WHERE UserID IS NOT NULL`,

  `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Guides') AND name = 'HourlyRate')
   ALTER TABLE Guides ADD HourlyRate DECIMAL(10,2) NULL`,

  `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Guides') AND name = 'DailyRate')
   ALTER TABLE Guides ADD DailyRate DECIMAL(10,2) NULL`,

  `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Guides') AND name = 'TotalReviews')
   ALTER TABLE Guides ADD TotalReviews INT NOT NULL DEFAULT 0`,

  // Backfill DailyRate from existing RatePerDay, link Guides to guide Users by email
  `UPDATE Guides SET DailyRate = RatePerDay WHERE DailyRate IS NULL`,

  `UPDATE g SET g.UserID = u.Id
   FROM Guides g INNER JOIN Users u ON u.Email = g.Email AND u.Role = 'guide'
   WHERE g.UserID IS NULL`,

  // Bookings: booking type + final price, backfilled
  `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Bookings') AND name = 'BookingType')
   ALTER TABLE Bookings ADD BookingType NVARCHAR(20) NOT NULL DEFAULT 'direct'
     CONSTRAINT CHK_Bookings_Type CHECK (BookingType IN ('direct','bid_accepted'))`,

  `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Bookings') AND name = 'FinalPrice')
   ALTER TABLE Bookings ADD FinalPrice DECIMAL(10,2) NULL`,

  `UPDATE Bookings SET FinalPrice = TotalAmount WHERE FinalPrice IS NULL`,

  // Bids: tourist -> guide custom offers
  `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Bids')
   CREATE TABLE Bids (
     BidID        INT IDENTITY PRIMARY KEY,
     TouristID    INT NOT NULL,
     GuideUserID  INT NOT NULL,
     OfferedPrice DECIMAL(10,2) NOT NULL,
     StartDate    DATE NOT NULL,
     EndDate      DATE NOT NULL,
     Message      NVARCHAR(MAX) NULL,
     Status       NVARCHAR(20) NOT NULL DEFAULT 'pending' CONSTRAINT CHK_Bids_Status CHECK (Status IN ('pending','accepted','rejected','cancelled')),
     BookingId    INT NULL,
     CreatedAt    DATETIME2 DEFAULT SYSUTCDATETIME(),
     CONSTRAINT FK_Bids_Tourist FOREIGN KEY (TouristID)   REFERENCES Users(Id),
     CONSTRAINT FK_Bids_Guide   FOREIGN KEY (GuideUserID) REFERENCES Users(Id),
     CONSTRAINT FK_Bids_Booking FOREIGN KEY (BookingId)   REFERENCES Bookings(Id),
     CONSTRAINT CHK_Bids_Dates  CHECK (EndDate >= StartDate),
     CONSTRAINT CHK_Bids_Price  CHECK (OfferedPrice >= 0)
   )`,

  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Bids_Tourist' AND object_id = OBJECT_ID('Bids'))
   CREATE INDEX IX_Bids_Tourist ON Bids(TouristID)`,

  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Bids_Guide' AND object_id = OBJECT_ID('Bids'))
   CREATE INDEX IX_Bids_Guide ON Bids(GuideUserID)`,

  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Bids_Status' AND object_id = OBJECT_ID('Bids'))
   CREATE INDEX IX_Bids_Status ON Bids(Status)`,
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