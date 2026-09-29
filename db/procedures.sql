-- =============================================
-- Hire Tourist Guide — STORED PROCEDURES + TRANSACTION
-- (Course Topic: PROCEDURE + TRANSACTION eksathe)
-- Run: views.sql er pore ei file run koro.
-- Viva line: "Sir, 3-4 ta table e ek sathe INSERT/UPDATE lage,
--   tai TRANSACTION vitore rekhechi — sob success hole COMMIT,
--   ekta fail hole ROLLBACK."
-- Node theke call: query('EXEC dbo.sp_SubmitReview @bookingId, @touristId, ...')
-- =============================================

-- 1) Review submit: Reviews INSERT + Guides.Rating/TotalReviews UPDATE
--    ek TRANSACTION e. age reviewController.createReview e Node diye chilo.
--    NOTE: live DB te Reviews = (ReviewerId/RevieweeId/ReviewerRole),
--    schema.sql e = (TouristUserId/GuideId) — nicher IF branch 2tatei chole.
CREATE OR ALTER PROCEDURE dbo.sp_SubmitReview
    @bookingId INT,
    @touristId INT,
    @rating    TINYINT,
    @comment   NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF (@rating < 1 OR @rating > 5)
    BEGIN
        THROW 50001, 'Rating must be between 1 and 5.', 1;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        -- (a) Booking ta completed + nijer kina check, row lock soho
        DECLARE @guideId INT;
        SELECT @guideId = GuideId
        FROM dbo.Bookings WITH (UPDLOCK, HOLDLOCK)
        WHERE Id = @bookingId AND TouristUserId = @touristId
          AND Status = 'completed';

        IF (@guideId IS NULL)
        BEGIN
            THROW 50002, 'Only your own completed bookings can be reviewed.', 1;
        END

        -- (b) Double review block
        IF EXISTS (SELECT 1 FROM dbo.Reviews WHERE BookingId = @bookingId)
        BEGIN
            THROW 50003, 'You have already reviewed this booking.', 1;
        END

        -- (c) Review insert (live vs schema.sql column set).
        -- NOTE: purano-schema branch dynamic SQL e, jate CREATE PROCEDURE
        -- live DB te column-check e fail na kore.
        IF EXISTS (SELECT 1 FROM sys.columns
                   WHERE object_id = OBJECT_ID('dbo.Reviews') AND name = 'RevieweeId')
        BEGIN
            INSERT INTO dbo.Reviews (BookingId, ReviewerId, RevieweeId, ReviewerRole, Rating, Comment)
            VALUES (@bookingId, @touristId, @guideId, 'tourist', @rating, @comment);
        END
        ELSE
        BEGIN
            EXEC sp_executesql
                N'INSERT INTO dbo.Reviews (BookingId, TouristUserId, GuideId, Rating, Comment)
                   VALUES (@b, @t, @g, @r, @c)',
                N'@b INT, @t INT, @g INT, @r TINYINT, @c NVARCHAR(MAX)',
                @b = @bookingId, @t = @touristId, @g = @guideId, @r = @rating, @c = @comment;
        END

        -- (d) Guide rating recalc (TRIGGER o same kaj kore — double-safe)
        DECLARE @avg DECIMAL(10,2), @cnt INT;
        IF EXISTS (SELECT 1 FROM sys.columns
                   WHERE object_id = OBJECT_ID('dbo.Reviews') AND name = 'RevieweeId')
        BEGIN
            SELECT @avg = AVG(CAST(Rating AS DECIMAL(10,2))), @cnt = COUNT(*)
            FROM dbo.Reviews WHERE RevieweeId = @guideId AND ReviewerRole = 'tourist';
        END
        ELSE
        BEGIN
            EXEC sp_executesql
                N'SELECT @a = AVG(CAST(Rating AS DECIMAL(10,2))), @n = COUNT(*)
                   FROM dbo.Reviews WHERE GuideId = @g',
                N'@g INT, @a DECIMAL(10,2) OUTPUT, @n INT OUTPUT',
                @g = @guideId, @a = @avg OUTPUT, @n = @cnt OUTPUT;
        END

        UPDATE dbo.Guides
        SET Rating = @avg, TotalReviews = @cnt, UpdatedAt = SYSUTCDATETIME()
        WHERE UserID = @guideId;

        COMMIT TRANSACTION;

        SELECT Id, BookingId, Rating, Comment, CreatedAt
        FROM dbo.Reviews WHERE BookingId = @bookingId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- 2) Bid accept: Request fulfilled + Bid accepted + baki bid rejected
--    + Bookings e confirmed row — 4 ta change 1 TRANSACTION e.
--    age customTourController.acceptBid e Node transaction e chilo.
CREATE OR ALTER PROCEDURE dbo.sp_AcceptBid
    @bidId     INT,
    @touristId INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @requestId INT, @guideId INT, @price DECIMAL(10,2);
        DECLARE @startDate DATE, @endDate DATE, @title NVARCHAR(150);

        SELECT @requestId = tb.RequestID, @guideId = tb.GuideID,
               @price = tb.OfferedPrice,
               @startDate = ctr.StartDate, @endDate = ctr.EndDate, @title = ctr.Title
        FROM dbo.TourBids tb WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.CustomTourRequests ctr WITH (UPDLOCK, HOLDLOCK)
            ON ctr.RequestID = tb.RequestID
        WHERE tb.BidID = @bidId
          AND ctr.TouristID = @touristId
          AND ctr.Status = 'open'
          AND tb.Status = 'pending';

        IF (@requestId IS NULL)
        BEGIN
            THROW 50004, 'Bid not found, not yours, or request is no longer open.', 1;
        END

        UPDATE dbo.CustomTourRequests SET Status = 'fulfilled'
        WHERE RequestID = @requestId AND Status = 'open';
        IF (@@ROWCOUNT <> 1) THROW 50005, 'Request already processed.', 1;

        UPDATE dbo.TourBids SET Status = 'accepted'
        WHERE BidID = @bidId AND Status = 'pending';
        IF (@@ROWCOUNT <> 1) THROW 50006, 'Bid already processed.', 1;

        UPDATE dbo.TourBids SET Status = 'rejected'
        WHERE RequestID = @requestId AND BidID <> @bidId AND Status = 'pending';

        INSERT INTO dbo.Bookings
            (TouristUserId, GuideId, StartDate, EndDate, Status, BookingType, TotalAmount, FinalPrice, Notes)
        VALUES
            (@touristId, @guideId, @startDate, @endDate, 'confirmed', 'bid_accepted',
             @price, @price, CONCAT('Accepted from custom tour: ', @title));

        DECLARE @newBookingId INT = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT Id, TouristUserId, GuideId, StartDate, EndDate, Status, TotalAmount, Notes, CreatedAt
        FROM dbo.Bookings WHERE Id = @newBookingId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- 3) Direct booking: blocked-date + overlapping check + INSERT
--    ek TRANSACTION e (SERIALIZABLE level e double-booking atkay).
--    age bookingController.createBooking e Node transaction e chilo.
CREATE OR ALTER PROCEDURE dbo.sp_CreateBooking
    @touristId INT,
    @guideId   INT,          -- Users.Id (guide account)
    @tourId    INT = NULL,
    @groupSize INT = 1,
    @startDate DATE,
    @endDate   DATE,
    @totalAmount DECIMAL(10,2),
    @notes     NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        BEGIN TRANSACTION;

        IF EXISTS (SELECT 1 FROM dbo.GuideAvailability WITH (UPDLOCK, HOLDLOCK)
                   WHERE GuideId = @guideId
                     AND BlockedDate >= @startDate AND BlockedDate <= @endDate)
        BEGIN
            THROW 50007, 'Guide has blocked one or more of these dates.', 1;
        END

        IF EXISTS (SELECT 1 FROM dbo.Bookings WITH (UPDLOCK, HOLDLOCK)
                   WHERE GuideId = @guideId AND Status IN ('pending','confirmed')
                     AND NOT (EndDate < @startDate OR StartDate > @endDate))
        BEGIN
            THROW 50008, 'Guide is already booked for the selected dates.', 1;
        END

        INSERT INTO dbo.Bookings
            (TouristUserId, GuideId, TourId, GroupSize, StartDate, EndDate,
             Status, BookingType, TotalAmount, FinalPrice, Notes)
        VALUES
            (@touristId, @guideId, @tourId, @groupSize, @startDate, @endDate,
             'pending', 'direct', @totalAmount, @totalAmount, @notes);

        DECLARE @newId INT = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT Id, TouristUserId, GuideId, TourId, GroupSize, StartDate, EndDate,
               Status, BookingType, TotalAmount, FinalPrice, PaymentStatus, Notes, CreatedAt
        FROM dbo.Bookings WHERE Id = @newId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- 4) Request cancel: CustomTourRequests cancelled + sob pending bid rejected
--    (TRANSACTION demo — choto bole viva te mukhosto bola easy).
CREATE OR ALTER PROCEDURE dbo.sp_CancelTourRequest
    @requestId INT,
    @touristId INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.CustomTourRequests SET Status = 'cancelled'
        WHERE RequestID = @requestId AND TouristID = @touristId AND Status = 'open';
        IF (@@ROWCOUNT <> 1) THROW 50009, 'Only your own open requests can be cancelled.', 1;

        UPDATE dbo.TourBids SET Status = 'rejected'
        WHERE RequestID = @requestId AND Status = 'pending';

        COMMIT TRANSACTION;
        SELECT 'Request cancelled' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
