-- =============================================
-- PROCEDURE DEMO (viva te SSMS e chalao)
-- Story: Guide Tour create kore -> Tourist booking kore (pending)
--        -> Guide accept kore (confirmed)
-- Niyom: upor theke niche highlight kore ekta block run koro.
-- (GO nai, tai @variable gula session-e mone thake.)
-- Sir line: "Procedure mane param soho save kora SQL program,
--   EXEC dile vitore transaction soho sob step ek sathe chole."
-- =============================================
USE TouristGuide;

-- STEP 0: demo ID (tomar data onujayi bodle nao)
DECLARE @touristId INT = 1;      -- Rahim (tourist)
DECLARE @tourId INT = 1011;      -- 3-Days Shajek Tour
DECLARE @guideId INT, @price DECIMAL(10,2);
SELECT @guideId = GuideId, @price = Price
FROM dbo.GuideTours WHERE Id = @tourId;
DECLARE @date DATE = CAST(DATEADD(DAY, 10, GETDATE()) AS DATE);
SELECT @guideId AS GuideId, @price AS Price, @date AS TourDate;

-- STEP 1: Tourist booking kore — PROCEDURE call
-- (vitore: blocked-date check + overlapping check + INSERT, 1 TRANSACTION e)
EXEC dbo.sp_CreateBooking
    @touristId = @touristId,
    @guideId = @guideId,
    @tourId = @tourId,
    @groupSize = 2,
    @startDate = @date,
    @endDate = @date,
    @totalAmount = @price,
    @notes = N'Viva demo booking';

-- STEP 2: View-te pending hishebe dekho
DECLARE @bookingId INT = (
    SELECT TOP 1 Id FROM dbo.Bookings
    WHERE TouristUserId = @touristId AND TourId = @tourId
    ORDER BY Id DESC
);
SELECT Id, TouristName, GuideName, TourTitle, Status
FROM dbo.vw_BookingDetails WHERE Id = @bookingId;
-- Status = pending (eita Sir-ke dekhao)

-- STEP 3: Guide accept korlo -> confirmed
UPDATE dbo.Bookings SET Status = 'confirmed' WHERE Id = @bookingId;
SELECT Id, TouristName, GuideName, TourTitle, Status
FROM dbo.vw_BookingDetails WHERE Id = @bookingId;
-- Status = confirmed + TRIGGER nijei tourist-ke notify koreche:
SELECT TOP 1 Title, Body, CreatedAt
FROM dbo.TouristNotifications
WHERE TouristUserId = @touristId ORDER BY Id DESC;

-- STEP 4: ROLLBACK proof — vul input-e procedure error dey, data bodlay na
EXEC dbo.sp_SubmitReview @bookingId = @bookingId, @touristId = @touristId, @rating = 99;
-- Error: "Rating must be between 1 and 5" (Reviews table-e kichu dhuke nai)

-- STEP 5: Cleanup — demo booking cancel (DB ager moto clean)
UPDATE dbo.Bookings SET Status = 'cancelled' WHERE Id = @bookingId;
SELECT Id, Status FROM dbo.Bookings WHERE Id = @bookingId;
