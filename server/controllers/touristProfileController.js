import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';
import bcrypt from 'bcryptjs';

/**
 * GET /api/tourist-profile/:userId
 * Public profile view — visible to guides.
 */
export async function getPublicProfile(req, res) {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError('Invalid user ID', 400);
  }

  // User basic info
  const userRows = await query(
    `SELECT Id, FullName, Email, AvatarUrl, CreatedAt FROM Users WHERE Id = @id AND Role = 'tourist'`,
    { id: userId }
  );
  if (!userRows.length) throw new AppError('Tourist not found', 404);
  const user = userRows[0];

  // Tourist profile
  const profileRows = await query(
    `SELECT Bio, City, Country, Languages, TravelInterests, IsNIDVerified
     FROM TouristProfiles WHERE UserID = @userId`,
    { userId }
  );
  const profile = profileRows[0] || {};

  // Stats: completed tours
  const statsRows = await query(
    `SELECT
       ISNULL(SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END), 0) AS completedTours,
       ISNULL(COUNT(*), 0) AS totalBookings
     FROM Bookings WHERE TouristUserId = @userId`,
    { userId }
  );
  const stats = statsRows[0] || { completedTours: 0, totalBookings: 0 };

  // Reviews from guides
  const reviewsRows = await query(
    `SELECT r.Rating, r.Comment, r.CreatedAt,
            g.FullName AS GuideName, g.AvatarUrl AS GuideAvatar
     FROM GuideReviewsOfTourists r
     INNER JOIN Users g ON g.Id = r.GuideID
     WHERE r.TouristID = @userId
     ORDER BY r.CreatedAt DESC`,
    { userId }
  );

  // Total reviews count
  const reviewCountRows = await query(
    'SELECT COUNT(*) AS totalReviews FROM GuideReviewsOfTourists WHERE TouristID = @userId',
    { userId }
  );

  res.json({
    ok: true,
    profile: {
      user,
      bio: profile.Bio || null,
      city: profile.City || null,
      country: profile.Country || null,
      languages: profile.Languages || null,
      travelInterests: profile.TravelInterests || null,
      isNidVerified: profile.IsNIDVerified === true,
      stats: {
        completedTours: Number(stats.completedTours) || 0,
        totalBookings: Number(stats.totalBookings) || 0,
        totalReviews: Number(reviewCountRows[0]?.totalReviews) || 0,
      },
      reviews: reviewsRows,
    },
  });
}

/**
 * GET /api/tourist-profile/me
 * Private profile — full data for the authenticated tourist.
 */
export async function getMyProfile(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401);

  // User info
  const userRows = await query(
    `SELECT Id, FullName, Email, Phone, AvatarUrl, Bio, CreatedAt
     FROM Users WHERE Id = @id`,
    { id: userId }
  );
  if (!userRows.length) throw new AppError('User not found', 404);
  const user = userRows[0];

  // Tourist profile (may not exist yet)
  const profileRows = await query(
    `SELECT Bio, City, Country, Languages, TravelInterests,
            EmergencyContactName, EmergencyContactPhone, IsNIDVerified
     FROM TouristProfiles WHERE UserID = @userId`,
    { userId }
  );
  const profile = profileRows[0] || null;

  // Stats
  const statsRows = await query(
    `SELECT
       ISNULL(SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END), 0) AS completedTours,
       ISNULL(SUM(CASE WHEN Status IN ('pending','confirmed') THEN 1 ELSE 0 END), 0) AS upcomingTours,
       ISNULL(COUNT(*), 0) AS totalBookings,
       ISNULL(SUM(CASE WHEN Status != 'cancelled' THEN TotalAmount ELSE 0 END), 0) AS totalSpent
     FROM Bookings WHERE TouristUserId = @userId`,
    { userId }
  );

  // Reviews from guides
  const reviewsRows = await query(
    `SELECT r.Rating, r.Comment, r.CreatedAt,
            g.FullName AS GuideName, g.AvatarUrl AS GuideAvatar
     FROM GuideReviewsOfTourists r
     INNER JOIN Users g ON g.Id = r.GuideID
     WHERE r.TouristID = @userId
     ORDER BY r.CreatedAt DESC`,
    { userId }
  );

  // Check if linked to Google
  const isGoogleLinked = userRows[0].Email && false; // simplified — no GoogleID column in existing schema

  res.json({
    ok: true,
    profile: {
      user,
      touristProfile: profile,
      stats: {
        completedTours: Number(statsRows[0]?.completedTours) || 0,
        upcomingTours: Number(statsRows[0]?.upcomingTours) || 0,
        totalBookings: Number(statsRows[0]?.totalBookings) || 0,
        totalSpent: Number(statsRows[0]?.totalSpent) || 0,
      },
      reviews: reviewsRows,
      isGoogleLinked,
    },
  });
}

/**
 * PUT /api/tourist-profile
 * Update profile — upserts TouristProfiles row and Updates Users table.
 */
export async function updateProfile(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 41);

  const {
    fullName, phone, avatarUrl, bio,
    city, country, languages, travelInterests,
    emergencyContactName, emergencyContactPhone,
  } = req.body || {};

  // 1. Update Users table fields
  const userFields = [];
  const userParams = { id: userId };

  if (fullName !== undefined) { userFields.push('FullName = @fullName'); userParams.fullName = fullName; }
  if (phone !== undefined) { userFields.push('Phone = @phone'); userParams.phone = phone || null; }
  if (avatarUrl !== undefined) { userFields.push('AvatarUrl = @avatarUrl'); userParams.avatarUrl = avatarUrl || null; }

  if (userFields.length) {
    userFields.push('UpdatedAt = SYSUTCDATETIME()');
    await query(`UPDATE Users SET ${userFields.join(', ')} WHERE Id = @id`, userParams);
  }

  // 2. Upsert TouristProfiles
  const existingProfile = await query(
    'SELECT ProfileID FROM TouristProfiles WHERE UserID = @userId',
    { userId }
  );

  const profileFields = [];
  const profileParams = { userId };

  if (bio !== undefined) { profileFields.push('Bio = @bio'); profileParams.bio = bio || null; }
  if (city !== undefined) { profileFields.push('City = @city'); profileParams.city = city || null; }
  if (country !== undefined) { profileFields.push('Country = @country'); profileParams.country = country || null; }
  if (languages !== undefined) { profileFields.push('Languages = @languages'); profileParams.languages = languages || null; }
  if (travelInterests !== undefined) { profileFields.push('TravelInterests = @travelInterests'); profileParams.travelInterests = travelInterests || null; }
  if (emergencyContactName !== undefined) { profileFields.push('EmergencyContactName = @ecn'); profileParams.ecn = emergencyContactName || null; }
  if (emergencyContactPhone !== undefined) { profileFields.push('EmergencyContactPhone = @ecp'); profileParams.ecp = emergencyContactPhone || null; }

  if (existingProfile.length) {
    // Update existing
    if (profileFields.length) {
      profileFields.push('UpdatedAt = SYSUTCDATETIME()');
      await query(
        `UPDATE TouristProfiles SET ${profileFields.join(', ')} WHERE UserID = @userId`,
        profileParams
      );
    }
  } else {
    // Insert new — use defaults for missing fields
    await query(
      `INSERT INTO TouristProfiles (UserID, Bio, City, Country, Languages, TravelInterests, EmergencyContactName, EmergencyContactPhone)
       VALUES (@userId, @bio, @city, @country, @languages, @travelInterests, @ecn, @ecp)`,
      {
        userId,
        bio: bio || null,
        city: city || null,
        country: country || null,
        languages: languages || null,
        travelInterests: travelInterests || null,
        ecn: emergencyContactName || null,
        ecp: emergencyContactPhone || null,
      }
    );
  }

  // 3. Re-fetch and return updated profile
  const userRows = await query(
    'SELECT Id, FullName, Email, Phone, AvatarUrl, Bio, CreatedAt FROM Users WHERE Id = @id',
    { id: userId }
  );
  const profileRows = await query(
    `SELECT Bio, City, Country, Languages, TravelInterests,
            EmergencyContactName, EmergencyContactPhone, IsNIDVerified
     FROM TouristProfiles WHERE UserID = @userId`,
    { userId }
  );

  res.json({
    ok: true,
    user: userRows[0],
    touristProfile: profileRows[0] || null,
  });
}

/**
 * PUT /api/tourist-profile/change-password
 * Update password securely.
 */
export async function changePassword(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401);

  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    throw new AppError('currentPassword and newPassword are required', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400);
  }

  // Fetch current hash
  const rows = await query(
    'SELECT PasswordHash FROM Users WHERE Id = @id',
    { id: userId }
  );
  if (!rows.length) throw new AppError('User not found', 404);

  const match = await bcrypt.compare(currentPassword, rows[0].PasswordHash || '');
  if (!match) throw new AppError('Current password is incorrect', 401);

  const newHash = await bcrypt.hash(newPassword, 10);
  await query(
    'UPDATE Users SET PasswordHash = @hash, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id',
    { hash: newHash, id: userId }
  );

  res.json({ ok: true, message: 'Password updated successfully' });
}
