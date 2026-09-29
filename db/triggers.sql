-- =============================================
-- Hire Tourist Guide — TRIGGERS (Course Topic: TRIGGER)
-- Run: procedures.sql er pore ei file run koro.
-- Viva line: "Sir, INSERT/UPDATE hole DB nijei porer kaj kore dey,
--   Node code theke alada query lage na."
-- Note: TRIGGER er vitore ROLLBACK/THROW kora jay,
--   kintu ekhane sudhu auto-update + auto-notify rakha (safe).
-- =============================================

-- 1) Review aslei guide rating auto-update.
--    age reviewController.createReview e manual AVG + UPDATE chilo —
--    ekhon DB nijei kore dey, Node code fail korleo rating thik thakbe.
--    Uses the canonical Reviews columns from db/schema.sql.
CREATE OR ALTER TRIGGER dbo.trg_Reviews_AfterInsert
ON dbo.Reviews
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE g
    SET Rating = agg.AvgRating,
        TotalReviews = agg.ReviewCount,
        UpdatedAt = SYSUTCDATETIME()
    FROM dbo.Guides g
    INNER JOIN (
        SELECT i.GuideId AS GuideKey,
               AVG(CAST(r.Rating AS DECIMAL(10,2))) AS AvgRating,
               COUNT(*) AS ReviewCount
        FROM inserted i
        INNER JOIN dbo.Reviews r ON r.GuideId = i.GuideId
        GROUP BY i.GuideId
    ) agg ON agg.GuideKey = g.UserID;
END;
GO

-- 2) Message aslei conversation list auto-update.
--    age socket.js e INSERT + UPDATE 2ta alada query chilo —
--    majhe server crash korle list purano theke jeto.
--    ekhon LastMessage kokhono miss hobe na.
CREATE OR ALTER TRIGGER dbo.trg_Messages_AfterInsert
ON dbo.Messages
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE c
    SET LastMessage = i.MessageText,
        LastMessageAt = i.CreatedAt
    FROM dbo.Conversations c
    INNER JOIN inserted i ON i.ConversationID = c.ConversationID;
END;
GO

-- 3) Booking status bodlale tourist ke auto-notify.
--    age bookingController.updateBookingStatus e Node diye
--    TouristNotifications INSERT chilo — ekhon status
--    'confirmed'/'cancelled'/'completed' holei DB nijei row banay.
CREATE OR ALTER TRIGGER dbo.trg_Bookings_AfterUpdate_Notify
ON dbo.Bookings
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.TouristNotifications (TouristUserId, Type, Title, Body, LinkUrl)
    SELECT
        i.TouristUserId,
        'booking',
        CASE LOWER(i.Status)
            WHEN 'confirmed' THEN 'Booking confirmed'
            WHEN 'cancelled' THEN 'Booking cancelled'
            WHEN 'completed' THEN 'Tour completed'
            ELSE 'Booking updated'
        END,
        CONCAT('Your booking #', i.Id, ' is now ', i.Status, '.'),
        '/dashboard'
    FROM inserted i
    INNER JOIN deleted d ON d.Id = i.Id
    WHERE i.Status <> d.Status
      AND LOWER(i.Status) IN ('confirmed', 'cancelled', 'completed');
END;
GO

-- 4) BONUS (choto, viva te optional): notun booking aslei
--    guide ke auto-notify — socket.js er notifyGuide er DB version.
CREATE OR ALTER TRIGGER dbo.trg_Bookings_AfterInsert_NotifyGuide
ON dbo.Bookings
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.GuideNotifications (GuideUserId, Type, Title, Body, LinkUrl)
    SELECT i.GuideId, 'booking', 'New booking request',
           CONCAT('New booking #', i.Id, ' for ', FORMAT(i.StartDate, 'yyyy-MM-dd'), '.'),
           '/bookings'
    FROM inserted i;
END;
GO
