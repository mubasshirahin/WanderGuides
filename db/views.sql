-- =============================================
-- Hire Tourist Guide — VIEWS (Course Topic: VIEW)
-- Run: SSMS e TouristGuide DB select kore ei file run koro,
--   অথবা: npm --prefix server run migrate:db-objects
-- Viva line: "Sir, vari JOIN gula View e save korechi,
--   Node code ekhon sudhu SELECT * FROM vw_... kore."
-- =============================================

-- 1) Booking list: bookingController.getAllBookings er JOIN ta
--    age 18 column er JOIN chilo, ekhon View theke 1 line e asbe.
CREATE OR ALTER VIEW dbo.vw_BookingDetails AS
SELECT
    b.Id,
    b.TouristUserId,
    b.GuideId,
    b.TourId,
    b.GroupSize,
    b.StartDate,
    b.EndDate,
    b.Status,
    b.BookingType,
    b.TotalAmount,
    b.FinalPrice,
    b.PaymentStatus,
    b.Notes,
    b.CreatedAt,
    DATEADD(HOUR, -48, CAST(b.StartDate AS DATETIME2)) AS CancellationDeadline,
    CASE WHEN SYSUTCDATETIME() < DATEADD(HOUR, -48, CAST(b.StartDate AS DATETIME2))
         THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS CanCancel,
    gt.Title AS TourTitle,
    gt.Itinerary,
    gt.MeetingPoint,
    gt.Location AS TourLocation,
    gt.ImageUrl AS TourImageUrl,
    tourist.FullName AS TouristName,
    tourist.Email AS TouristEmail,
    guide.FullName AS GuideName,
    guide.Email AS GuideEmail,
    guide.Phone AS GuidePhone,
    guide.AvatarUrl AS GuideAvatarUrl,
    guide.Bio AS GuideBio
FROM dbo.Bookings b
INNER JOIN dbo.Users tourist ON tourist.Id = b.TouristUserId
INNER JOIN dbo.Users guide   ON guide.Id   = b.GuideId
LEFT JOIN dbo.GuideTours gt  ON gt.Id = b.TourId;
GO

-- 2) Guide directory: exploreGuides / browseTours er base JOIN.
--    COALESCE(DailyRate, RatePerDay) ke EffectiveDailyRate nam e fix kore dilam.
CREATE OR ALTER VIEW dbo.vw_GuideDirectory AS
SELECT
    g.Id,
    g.UserID,
    g.FullName,
    g.Email,
    g.Phone,
    g.City,
    g.Bio,
    g.Specialties,
    g.Languages,
    g.HourlyRate,
    g.RatePerDay,
    COALESCE(g.DailyRate, g.RatePerDay) AS EffectiveDailyRate,
    g.Rating,
    g.TotalReviews,
    g.IsVerified,
    g.IsActive,
    u.AvatarUrl
FROM dbo.Guides g
LEFT JOIN dbo.Users u ON u.Id = g.UserID;
GO

-- 3) Open custom-tour requests: getOpenRequests er
--    Request + Tourist + BidCount ek sathe.
CREATE OR ALTER VIEW dbo.vw_OpenCustomRequests AS
SELECT
    ctr.RequestID,
    ctr.TouristID,
    ctr.Title,
    ctr.Destination,
    ctr.StartDate,
    ctr.EndDate,
    ctr.GroupSize,
    ctr.Budget,
    ctr.Description,
    ctr.Status,
    ctr.CreatedAt,
    u.FullName AS TouristName,
    u.AvatarUrl AS TouristAvatar,
    (SELECT COUNT(*) FROM dbo.TourBids tb
      WHERE tb.RequestID = ctr.RequestID AND tb.Status = 'pending') AS BidCount,
    (SELECT COUNT(*) FROM dbo.TourBids tb
      WHERE tb.RequestID = ctr.RequestID) AS TotalBids
FROM dbo.CustomTourRequests ctr
INNER JOIN dbo.Users u ON u.Id = ctr.TouristID;
GO

-- 4) Guide earnings (analytics): getGuideBookingSummary er
--    RIGHT JOIN + GROUP BY ta View e rakha.
CREATE OR ALTER VIEW dbo.vw_GuideEarnings AS
SELECT
    g.Id AS GuideId,
    g.FullName AS GuideName,
    g.City,
    g.Rating,
    COUNT(b.Id) AS TotalBookings,
    ISNULL(SUM(b.TotalAmount), 0) AS TotalEarnings,
    ISNULL(SUM(CASE WHEN b.Status = 'completed' THEN b.TotalAmount ELSE 0 END), 0) AS CompletedEarnings
FROM dbo.Guides g
LEFT JOIN dbo.Bookings b ON b.GuideId = g.UserID
WHERE g.IsActive = 1
GROUP BY g.Id, g.FullName, g.City, g.Rating;
GO

-- 5) Monthly revenue (analytics): getMonthlyRevenue er
--    FORMAT + MIN/MAX/AVG aggregation ta View e rakha.
CREATE OR ALTER VIEW dbo.vw_MonthlyRevenue AS
SELECT
    FORMAT(b.CreatedAt, 'yyyy-MM') AS [Month],
    COUNT(*) AS TotalBookings,
    SUM(b.TotalAmount) AS TotalRevenue,
    MIN(b.TotalAmount) AS MinBookingAmount,
    MAX(b.TotalAmount) AS MaxBookingAmount,
    AVG(b.TotalAmount) AS AvgBookingAmount
FROM dbo.Bookings b
WHERE b.Status <> 'cancelled'
GROUP BY FORMAT(b.CreatedAt, 'yyyy-MM');
GO
