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

async function ensureBooking(b) {
  const exists = await query(
    `SELECT Id FROM Bookings WHERE TouristUserId = @tourist AND GuideId = @guide AND StartDate = @startDate`,
    { tourist: b.touristId, guide: b.guideId, startDate: b.startDate }
  );
  if (exists.length) return exists[0].Id;

  const sql = `
    INSERT INTO Bookings (TouristUserId, GuideId, StartDate, EndDate, Status, TotalAmount, Notes)
    OUTPUT INSERTED.Id
    VALUES (@tourist, @guide, @startDate, @endDate, @status, @totalAmount, @notes)
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
      INSERT INTO Reviews (BookingId, TouristUserId, GuideId, Rating, Comment)
      OUTPUT INSERTED.Id
      VALUES (@bookingId, @touristId, @guideId, @rating, @comment)
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
