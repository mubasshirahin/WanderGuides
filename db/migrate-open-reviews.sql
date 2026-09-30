-- =============================================
-- Open reviews from Explore view (no completed tour needed)
-- Run once on live DB: sqlcmd / SSMS / npm run migrate:db-objects
-- je keo View te giye guide ke rating/review dite parbe
-- =============================================

-- 1) Old UNIQUE constraint thakle drop (BookingIdalar single UNIQUE)
IF EXISTS (
  SELECT 1 FROM sys.key_constraints
  WHERE name = 'UQ_Reviews_Booking' AND parent_object_id = OBJECT_ID('dbo.Reviews')
)
  ALTER TABLE dbo.Reviews DROP CONSTRAINT UQ_Reviews_Booking;
GO

-- 2) BookingId NULL korte hobe (open review er jonno)
IF EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Reviews') AND name = 'BookingId' AND is_nullable = 0
)
  ALTER TABLE dbo.Reviews ALTER COLUMN BookingId INT NULL;
GO

-- 3) One review per booking (filtered, NULL baad)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Reviews_Booking' AND object_id = OBJECT_ID('dbo.Reviews'))
  CREATE UNIQUE INDEX UQ_Reviews_Booking ON dbo.Reviews(BookingId) WHERE BookingId IS NOT NULL;
GO

-- 4) One open review per tourist per guide (Explore view)
-- schema.sql columns: TouristUserId/GuideId
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Reviews') AND name = 'RevieweeId')
  AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Reviews_Open_TouristGuide' AND object_id = OBJECT_ID('dbo.Reviews'))
  CREATE UNIQUE INDEX UQ_Reviews_Open_TouristGuide ON dbo.Reviews(TouristUserId, GuideId) WHERE BookingId IS NULL;
GO

-- 5) Live DB columns: ReviewerId/RevieweeId/ReviewerRole — same rule
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Reviews') AND name = 'RevieweeId')
  AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Reviews_Open_Live' AND object_id = OBJECT_ID('dbo.Reviews'))
  CREATE UNIQUE INDEX UQ_Reviews_Open_Live ON dbo.Reviews(ReviewerId, RevieweeId, ReviewerRole) WHERE BookingId IS NULL;
GO
