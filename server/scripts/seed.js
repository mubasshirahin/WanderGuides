import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';

async function ensureUser(u) {
  const exists = await query('SELECT Id FROM Users WHERE Email = @email', { email: u.email });
  if (exists.length) return exists[0].Id;

  const passwordHash = await bcrypt.hash(u.password || 'password', 10);
  const sql = `
    INSERT INTO Users (FullName, Email, PasswordHash, Role, Phone, AvatarUrl, Bio, IsActive)
    OUTPUT INSERTED.Id
    VALUES (@fullName, @email, @passwordHash, @role, @phone, @avatarUrl, @bio, 1)
  `;
  const rows = await query(sql, {
    fullName: u.fullName,
    email: u.email,
    passwordHash,
    role: u.role,
    phone: u.phone || null,
    avatarUrl: u.avatarUrl || null,
    bio: u.bio || null,
  });
  return rows[0].Id;
}

async function ensureGuideListing(userId, guide) {
  const existing = await query(
    'SELECT Id FROM Guides WHERE UserID = @userId OR Email = @email',
    { userId, email: guide.email }
  );
  const values = {
    userId,
    fullName: guide.fullName,
    email: guide.email,
    phone: guide.phone,
    city: guide.city,
    bio: guide.bio,
    specialties: guide.specialties,
    languages: guide.languages,
    hourlyRate: guide.hourlyRate,
    dailyRate: guide.dailyRate,
    rating: guide.rating,
    totalReviews: guide.totalReviews,
  };

  if (existing.length) {
    await query(
      `UPDATE Guides SET UserID = @userId, FullName = @fullName, Phone = @phone,
         City = @city, Bio = @bio, Specialties = @specialties, Languages = @languages,
         HourlyRate = @hourlyRate, DailyRate = @dailyRate, RatePerDay = @dailyRate,
         Rating = @rating, TotalReviews = @totalReviews, IsActive = 1,
         UpdatedAt = SYSUTCDATETIME()
       WHERE Id = @id`,
      { ...values, id: existing[0].Id }
    );
    return existing[0].Id;
  }

  const rows = await query(
    `INSERT INTO Guides
       (UserID, FullName, Email, Phone, City, Bio, Specialties, Languages,
        HourlyRate, DailyRate, RatePerDay, Rating, TotalReviews, IsActive)
     OUTPUT INSERTED.Id
     VALUES (@userId, @fullName, @email, @phone, @city, @bio, @specialties,
        @languages, @hourlyRate, @dailyRate, @dailyRate, @rating, @totalReviews, 1)`,
    values
  );
  return rows[0].Id;
}

async function ensureGuideTour(guideId, tour) {
  const existing = await query(
    'SELECT Id FROM GuideTours WHERE GuideId = @guideId AND Title = @title',
    { guideId, title: tour.title }
  );
  if (existing.length) {
    await query(
      `UPDATE GuideTours SET ImageUrl = COALESCE(ImageUrl, @imageUrl),
         Category = COALESCE(Category, @category), Difficulty = COALESCE(Difficulty, @difficulty),
         MeetingPoint = COALESCE(MeetingPoint, @meetingPoint), Highlights = COALESCE(Highlights, @highlights),
         Itinerary = COALESCE(Itinerary, @itinerary)
       WHERE Id = @id`,
      { id: existing[0].Id, ...tour }
    );
    return existing[0].Id;
  }

  const rows = await query(
    `INSERT INTO GuideTours
       (GuideId, Title, Description, Location, Price, DurationHours, MaxGroupSize,
        Category, Difficulty, MeetingPoint, Included, Highlights, Languages, ImageUrl, Itinerary)
     OUTPUT INSERTED.Id
     VALUES (@guideId, @title, @description, @location, @price, @durationHours,
        @maxGroupSize, @category, @difficulty, @meetingPoint, @included,
        @highlights, @languages, @imageUrl, @itinerary)`,
    { guideId, ...tour }
  );
  return rows[0].Id;
}

async function ensureBooking(b) {
  const exists = await query(
    `SELECT Id FROM Bookings WHERE TouristUserId = @tourist AND GuideId = @guide AND StartDate = @startDate`,
    { tourist: b.touristId, guide: b.guideId, startDate: b.startDate }
  );
  if (exists.length) return exists[0].Id;

  // NOTE: Bookings-te trigger thakle OUTPUT without INTO fail kore, tai INTO pattern.
  const sql = `
    DECLARE @seedBooking TABLE (Id INT);
    INSERT INTO Bookings (TouristUserId, GuideId, StartDate, EndDate, Status, TotalAmount, Notes)
    OUTPUT INSERTED.Id INTO @seedBooking
    VALUES (@tourist, @guide, @startDate, @endDate, @status, @totalAmount, @notes);
    SELECT Id FROM @seedBooking;
  `;
  const rows = await query(sql, {
    tourist: b.touristId,
    guide: b.guideId,
    startDate: b.startDate,
    endDate: b.endDate,
    status: b.status || 'pending',
    totalAmount: b.totalAmount || 0,
    notes: b.notes || null,
  });
  return rows[0].Id;
}

async function ensureReview(review) {
  const exists = await query('SELECT Id FROM Reviews WHERE BookingId = @bookingId', {
    bookingId: review.bookingId,
  });
  if (exists.length) return exists[0].Id;

  const rows = await query(
    `
      DECLARE @seedReview TABLE (Id INT);
      INSERT INTO Reviews (BookingId, TouristUserId, GuideId, Rating, Comment)
      OUTPUT INSERTED.Id INTO @seedReview
      VALUES (@bookingId, @touristId, @guideId, @rating, @comment);
      SELECT Id FROM @seedReview;
    `,
    review
  );
  return rows[0].Id;
}

async function run() {
  try {
    console.log('[seed] Starting database seed...');

    const guides = [
      { fullName: 'Alice Walker', email: 'alice@example.com', password: 'password', role: 'guide', city: 'NY' },
      { fullName: 'Bob Stone', email: 'bob@example.com', password: 'password', role: 'guide', city: 'SF' },
      { fullName: 'Carlos Diaz', email: 'carlos@example.com', password: 'password', role: 'guide', city: 'LA' },
      { fullName: 'Diana Prince', email: 'diana@example.com', password: 'password', role: 'guide', city: 'Chicago' },
      { fullName: 'Evan Blake', email: 'evan@example.com', password: 'password', role: 'guide', city: 'Miami' },
    ];

    // Clearly fictional local demo listings so Explore Guides and Browse Tours
    // have useful content immediately after running the seed command.
    const demoGuides = [
      {
        fullName: 'Amina Rahman', email: 'amina.demo@example.com', password: 'password', role: 'guide',
        city: 'Dhaka', phone: '+8801700000001', bio: 'Local historian sharing Old Dhaka food, architecture, and riverfront stories.',
        specialties: 'Old Dhaka, Street Food, History', languages: 'Bangla, English', hourlyRate: 500, dailyRate: 3500,
        rating: 4.9, totalReviews: 24,
        tour: { title: 'Old Dhaka Heritage & Food Walk', description: 'A relaxed walk through historic lanes, landmarks, and local food stops.', location: 'Dhaka', price: 3500, durationHours: 6, maxGroupSize: 6, category: 'Cultural', difficulty: 'Easy', meetingPoint: 'Lalbagh Fort main gate', included: 'Local snacks, bottled water', highlights: 'Lalbagh Fort, Shakhari Bazaar, Dhakeshwari Temple', languages: 'Bangla, English', imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1000&q=80', itinerary: JSON.stringify([{ title: 'Lalbagh Fort', details: 'Meet at the main gate and explore the Mughal-era fort.' }, { title: 'Shakhari Bazaar', details: 'Walk through the historic lanes and stop for local snacks.' }, { title: 'Dhakeshwari Temple', details: 'Finish with a guided visit to the city landmark.' }]) },
      },
      {
        fullName: 'Shafiq Ahmed', email: 'shafiq.demo@example.com', password: 'password', role: 'guide',
        city: "Cox's Bazar", phone: '+8801700000002', bio: 'Coastal guide focused on safe beach outings and nearby fishing communities.',
        specialties: 'Beach, Local Culture, Photography', languages: 'Bangla, English', hourlyRate: 450, dailyRate: 3200,
        rating: 4.8, totalReviews: 18,
        tour: { title: "Cox's Bazar Coast & Fishing Villages", description: 'Explore the shoreline, local markets, and nearby coastal communities.', location: "Cox's Bazar", price: 3200, durationHours: 5, maxGroupSize: 8, category: 'Beach', difficulty: 'Easy', meetingPoint: 'Laboni Beach entrance', included: 'Water, local transport', highlights: 'Laboni Beach, local fish market, sunset viewpoint', languages: 'Bangla, English', imageUrl: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1000&q=80' },
      },
      {
        fullName: 'Nusrat Jahan', email: 'nusrat.demo@example.com', password: 'password', role: 'guide',
        city: 'Sylhet', phone: '+8801700000003', bio: 'Nature and tea garden guide with an emphasis on responsible local travel.',
        specialties: 'Tea Gardens, Nature, Hiking', languages: 'Bangla, English', hourlyRate: 600, dailyRate: 4200,
        rating: 5, totalReviews: 31,
        tour: { title: 'Sylhet Tea Gardens & Ratargul', description: 'Visit tea gardens and discover the wetlands with a local guide.', location: 'Sylhet', price: 4200, durationHours: 8, maxGroupSize: 6, category: 'Nature', difficulty: 'Moderate', meetingPoint: 'Sylhet Railway Station', included: 'Boat ride, drinking water', highlights: 'Tea gardens, Ratargul swamp forest, local lunch stop', languages: 'Bangla, English', imageUrl: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=80', itinerary: JSON.stringify([{ title: 'Tea garden visit', details: 'Walk among the tea fields with local tea and photo stops.' }, { title: 'Ratargul wetlands', details: 'Take a guided boat trip through the swamp forest.' }, { title: 'Local lunch', details: 'Enjoy a regional meal before returning to Sylhet.' }]) },
      },
      {
        fullName: 'Tanvir Hasan', email: 'tanvir.demo@example.com', password: 'password', role: 'guide',
        city: 'Chattogram', phone: '+8801700000004', bio: 'Experienced hill and city guide introducing visitors to Chattogram.',
        specialties: 'City Tours, Hills, Local Food', languages: 'Bangla, English', hourlyRate: 550, dailyRate: 4000,
        rating: 4.7, totalReviews: 15,
        tour: { title: 'Chattogram City & Hill Views', description: 'A city tour with viewpoints, heritage stops, and regional food.', location: 'Chattogram', price: 4000, durationHours: 7, maxGroupSize: 8, category: 'Cultural', difficulty: 'Easy', meetingPoint: 'Anderkilla Shahi Jame Mosque', included: 'Local transport, tea', highlights: 'Anderkilla, Foy’s Lake viewpoint, traditional food', languages: 'Bangla, English', imageUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1000&q=80' },
      },
    ];

    const tourists = [
      { fullName: 'Frank Guest', email: 'frank@example.com', password: 'password', role: 'tourist' },
      { fullName: 'Grace Lee', email: 'grace@example.com', password: 'password', role: 'tourist' },
    ];

    const guideIds = {};
    for (const g of guides) {
      const id = await ensureUser(g);
      guideIds[g.email] = id;
      console.log(`[seed] Guide ensured: ${g.email} -> ${id}`);
    }

    for (const guide of demoGuides) {
      const id = await ensureUser(guide);
      const listingId = await ensureGuideListing(id, guide);
      const tourId = await ensureGuideTour(id, guide.tour);
      console.log(`[seed] Demo guide and tour ensured: ${guide.fullName} -> ${listingId}/${tourId}`);
    }

    const touristIds = {};
    for (const t of tourists) {
      const id = await ensureUser(t);
      touristIds[t.email] = id;
      console.log(`[seed] Tourist ensured: ${t.email} -> ${id}`);
    }

    const bookings = [
      { touristEmail: 'frank@example.com', guideEmail: 'alice@example.com', startDate: '2026-09-01', endDate: '2026-09-03', totalAmount: 300.00 },
      { touristEmail: 'grace@example.com', guideEmail: 'bob@example.com', startDate: '2026-09-10', endDate: '2026-09-12', totalAmount: 450.00 },
      { touristEmail: 'frank@example.com', guideEmail: 'carlos@example.com', startDate: '2026-10-05', endDate: '2026-10-07', totalAmount: 200.00 },
    ];

    const bookingIds = {};
    for (const b of bookings) {
      const bookingObj = {
        touristId: touristIds[b.touristEmail],
        guideId: guideIds[b.guideEmail],
        startDate: b.startDate,
        endDate: b.endDate,
        totalAmount: b.totalAmount,
        notes: b.notes || null,
        status: b.status || 'pending',
      };
      const id = await ensureBooking(bookingObj);
      bookingIds[`${b.touristEmail}:${b.guideEmail}`] = id;
      console.log(`[seed] Booking ensured: ${id} (${b.touristEmail} -> ${b.guideEmail})`);
    }

    const reviews = [
      {
        bookingId: bookingIds['frank@example.com:alice@example.com'],
        touristId: touristIds['frank@example.com'],
        guideId: guideIds['alice@example.com'],
        rating: 5,
        comment: 'Excellent guide—friendly, knowledgeable, and well organized.',
      },
      {
        bookingId: bookingIds['grace@example.com:bob@example.com'],
        touristId: touristIds['grace@example.com'],
        guideId: guideIds['bob@example.com'],
        rating: 4,
        comment: 'Great local recommendations and a very enjoyable tour.',
      },
    ];

    for (const review of reviews) {
      const id = await ensureReview(review);
      console.log(`[seed] Review ensured: ${id} (booking ${review.bookingId})`);
    }

    console.log('[seed] Database seed completed.');
    process.exit(0);
  } catch (err) {
    console.error('[seed] Error during seeding:', err);
    process.exit(1);
  }
}

run();
