-- =============================================
-- Hire Tourist Guide — TRANSACTION (Course Topic: TRANSACTION)
-- Viva te SSMS e line-by-line run kore dekhanor jonno.
-- Niyom: BEGIN TRAN ... sob thik hole COMMIT, ekta fail hole ROLLBACK.
-- NOTE: niche @touristId/@guideId bodle real Id bosiye run koro.
-- =============================================

-- DEMO 1: Bid accept (4 table 1 sathe) — sp_AcceptBid er raw version.
-- Sir ke bolo: "majhpothe current off holeo data half-save hobe na."
BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @bidId INT = 1, @touristId INT = 1;  -- <-- bodle nao

    UPDATE dbo.CustomTourRequests SET Status = 'fulfilled'
    WHERE RequestID = (SELECT RequestID FROM dbo.TourBids WHERE BidID = @bidId)
      AND TouristID = @touristId AND Status = 'open';
    IF (@@ROWCOUNT <> 1) THROW 50001, 'Request no longer open.', 1;

    UPDATE dbo.TourBids SET Status = 'accepted'
    WHERE BidID = @bidId AND Status = 'pending';
    IF (@@ROWCOUNT <> 1) THROW 50002, 'Bid already processed.', 1;

    UPDATE dbo.TourBids SET Status = 'rejected'
    WHERE RequestID = (SELECT RequestID FROM dbo.TourBids WHERE BidID = @bidId)
      AND BidID <> @bidId AND Status = 'pending';

    -- Booking row tao same TRAN er vitore hoto (sp_AcceptBid e ache).

    COMMIT TRANSACTION;
    PRINT 'COMMIT: sob step success.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT CONCAT('ROLLBACK: ', ERROR_MESSAGE());
END CATCH;
GO

-- DEMO 2: Review submit (INSERT + rating UPDATE) — sp_SubmitReview er raw version.
BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @bookingId INT = 1, @myTouristId INT = 1;  -- <-- bodle nao

    INSERT INTO dbo.Reviews (BookingId, TouristUserId, GuideId, Rating, Comment)
    SELECT @bookingId, @myTouristId, GuideId, 5, 'Demo review'
    FROM dbo.Bookings
    WHERE Id = @bookingId AND TouristUserId = @myTouristId AND Status = 'completed';

    IF (@@ROWCOUNT <> 1) THROW 50003, 'Only own completed booking.', 1;

    -- Guides rating update ta TRIGGER (trg_Reviews_AfterInsert) nijei kore dey,
    -- tao ekhane explicit dekhano jate TRANSACTION bojha jay.

    COMMIT TRANSACTION;
    PRINT 'COMMIT: review saved.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT CONCAT('ROLLBACK: ', ERROR_MESSAGE());
END CATCH;
GO
