import { query } from '../config/db.js';

/** GET /api/bookings — placeholder. Join Bookings with Users/Guides here. */
export const getAllBookings = async (req, res) => {
  try {
    // const rows = await query('SELECT * FROM Bookings');
    res.json({ ok: true, bookings: [] });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Failed to load bookings', error: err.message });
  }
};

/** POST /api/bookings — placeholder. Validate availability + insert here. */
export const createBooking = async (req, res) => {
  const body = req.body || {};
  // TODO: validate dates/guide, insert into Bookings, send confirmation.
  res.status(501).json({ ok: false, message: 'Create booking not implemented yet', received: body });
};
