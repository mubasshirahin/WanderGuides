-- ============================================
-- AGGREGATE QUERIES (GROUP BY, HAVING, AVG, MIN, MAX, COUNT)
-- Used in: GET /api/guides/top-rated
-- Frontend: Landing Page → "Top Cities" section
-- ============================================

-- 1. Top Cities by Guide Rating (GROUP BY + HAVING + Aggregates)
SELECT 
    g.City,
    COUNT(*) AS guideCount,
    AVG(COALESCE(g.DailyRate, g.RatePerDay)) AS avgDailyRate,
    MIN(COALESCE(g.DailyRate, g.RatePerDay)) AS minDailyRate,
    MAX(COALESCE(g.DailyRate, g.RatePerDay)) AS maxDailyRate,
    AVG(g.Rating) AS avgRating
FROM Guides g
WHERE g.IsActive = 1
GROUP BY g.City
HAVING COUNT(*) >= 1
ORDER BY avgRating DESC;


-- 2. Guide Count per City (simple GROUP BY)
SELECT 
    g.City, 
    COUNT(*) AS totalGuides
FROM Guides g
WHERE g.IsActive = 1
GROUP BY g.City
ORDER BY totalGuides DESC;


-- 3. Average Rating per City (AVG + GROUP BY)
SELECT 
    g.City, 
    ROUND(AVG(g.Rating), 2) AS averageRating
FROM Guides g
WHERE g.IsActive = 1
GROUP BY g.City
ORDER BY averageRating DESC;


-- 4. Price Range per City (MIN, MAX, AVG)
SELECT 
    g.City,
    MIN(COALESCE(g.DailyRate, g.RatePerDay)) AS cheapest,
    MAX(COALESCE(g.DailyRate, g.RatePerDay)) AS expensive,
    ROUND(AVG(COALESCE(g.DailyRate, g.RatePerDay)), 0) AS average
FROM Guides g
WHERE g.IsActive = 1
GROUP BY g.City;


-- 5. Cities with More Than 1 Guide (HAVING filter)
SELECT 
    g.City, 
    COUNT(*) AS guideCount
FROM Guides g
WHERE g.IsActive = 1
GROUP BY g.City
HAVING COUNT(*) > 1
ORDER BY guideCount DESC;


-- 6. Specialties Count per Guide (GROUP BY with JOIN)
SELECT 
    u.FullName,
    g.City,
    g.Specialties,
    LEN(g.Specialties) - LEN(REPLACE(g.Specialties, ',', '')) + 1 AS specialtyCount
FROM Guides g
INNER JOIN Users u ON u.Id = g.UserID
WHERE g.IsActive = 1 AND g.Specialties IS NOT NULL
ORDER BY specialtyCount DESC;


-- 7. Booking Stats per Guide (COUNT + GROUP BY + JOIN)
SELECT 
    u.FullName,
    g.City,
    COUNT(b.Id) AS totalBookings,
    SUM(CASE WHEN b.Status = 'completed' THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN b.Status = 'pending' THEN 1 ELSE 0 END) AS pending
FROM Guides g
INNER JOIN Users u ON u.Id = g.UserID
LEFT JOIN Bookings b ON b.GuideId = u.Id
WHERE g.IsActive = 1
GROUP BY u.FullName, g.City
ORDER BY totalBookings DESC;


-- 8. Tour Price Stats per Guide (AVG, MIN, MAX on GuideTours)
SELECT 
    u.FullName,
    g.City,
    COUNT(gt.Id) AS totalTours,
    MIN(gt.Price) AS cheapestTour,
    MAX(gt.Price) AS expensiveTour,
    ROUND(AVG(gt.Price), 0) AS avgTourPrice
FROM Guides g
INNER JOIN Users u ON u.Id = g.UserID
LEFT JOIN GuideTours gt ON gt.GuideId = u.Id
WHERE g.IsActive = 1
GROUP BY u.FullName, g.City
HAVING COUNT(gt.Id) >= 1
ORDER BY avgTourPrice DESC;


-- 9. Review Stats per Guide (COUNT, AVG on Reviews)
SELECT 
    u.FullName,
    g.City,
    COUNT(r.Id) AS totalReviews,
    ROUND(AVG(r.Rating), 2) AS avgReviewRating
FROM Guides g
INNER JOIN Users u ON u.Id = g.UserID
LEFT JOIN Reviews r ON r.GuideId = u.Id
WHERE g.IsActive = 1
GROUP BY u.FullName, g.City
ORDER BY avgReviewRating DESC;


-- 10. Overall Platform Stats (aggregate without GROUP BY)
SELECT 
    COUNT(DISTINCT g.Id) AS totalGuides,
    COUNT(DISTINCT g.City) AS totalCities,
    ROUND(AVG(g.Rating), 2) AS overallAvgRating,
    MIN(COALESCE(g.DailyRate, g.RatePerDay)) AS minPrice,
    MAX(COALESCE(g.DailyRate, g.RatePerDay)) AS maxPrice,
    ROUND(AVG(COALESCE(g.DailyRate, g.RatePerDay)), 0) AS avgPrice
FROM Guides g
WHERE g.IsActive = 1;
