import test from 'node:test';
import assert from 'node:assert/strict';

import { createUpdateBookingStatus } from '../controllers/bookingController.js';

function createResponse() {
  return {
    body: undefined,
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
    },
  };
}

test('guide can confirm their own booking', async () => {
  const calls = [];
  const updatedBooking = { Id: 7, TouristUserId: 12, GuideId: 34, Status: 'confirmed' };
  const handler = createUpdateBookingStatus(async (sql, params) => {
    calls.push({ sql, params });
    return calls.length === 1
      ? [{ Id: 7, TouristUserId: 12, GuideId: 34, Status: 'pending' }]
      : [updatedBooking];
  });
  const res = createResponse();

  await handler(
    { params: { id: '7' }, body: { status: 'confirmed' }, user: { id: 34, role: 'guide' } },
    res
  );

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].params, { bookingId: 7, status: 'confirmed' });
  assert.match(calls[1].sql, /UPDATE Bookings/);
  assert.deepEqual(res.body, { ok: true, booking: updatedBooking });
});

test('guide cannot update another guide booking', async () => {
  let updateCalled = false;
  const handler = createUpdateBookingStatus(async (sql) => {
    if (/UPDATE Bookings/.test(sql)) updateCalled = true;
    return [{ Id: 7, TouristUserId: 12, GuideId: 34, Status: 'pending' }];
  });

  await assert.rejects(
    handler(
      { params: { id: '7' }, body: { status: 'confirmed' }, user: { id: 99, role: 'guide' } },
      createResponse()
    ),
    { message: 'Forbidden', statusCode: 403 }
  );
  assert.equal(updateCalled, false);
});

test('tourist can cancel their own pending booking', async () => {
  const calls = [];
  const updatedBooking = { Id: 7, TouristUserId: 12, GuideId: 34, Status: 'cancelled' };
  const handler = createUpdateBookingStatus(async (sql, params) => {
    calls.push({ sql, params });
    return calls.length === 1
      ? [{ Id: 7, TouristUserId: 12, GuideId: 34, Status: 'pending' }]
      : [updatedBooking];
  });
  const res = createResponse();

  await handler(
    { params: { id: '7' }, body: { status: 'cancelled' }, user: { id: 12, role: 'tourist' } },
    res
  );

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].params, { bookingId: 7, status: 'cancelled' });
  assert.deepEqual(res.body, { ok: true, booking: updatedBooking });
});

test('tourist cannot cancel another tourist booking', async () => {
  let updateCalled = false;
  const handler = createUpdateBookingStatus(async (sql) => {
    if (/UPDATE Bookings/.test(sql)) updateCalled = true;
    return [{ Id: 7, TouristUserId: 12, GuideId: 34, Status: 'confirmed' }];
  });

  await assert.rejects(
    handler(
      { params: { id: '7' }, body: { status: 'cancelled' }, user: { id: 99, role: 'tourist' } },
      createResponse()
    ),
    { message: 'Forbidden', statusCode: 403 }
  );
  assert.equal(updateCalled, false);
});

test('tourist cannot cancel completed booking', async () => {
  let updateCalled = false;
  const handler = createUpdateBookingStatus(async (sql) => {
    if (/UPDATE Bookings/.test(sql)) updateCalled = true;
    return [{ Id: 7, TouristUserId: 12, GuideId: 34, Status: 'completed' }];
  });

  await assert.rejects(
    handler(
      { params: { id: '7' }, body: { status: 'cancelled' }, user: { id: 12, role: 'tourist' } },
      createResponse()
    ),
    { message: 'Only pending or confirmed bookings can be cancelled', statusCode: 400 }
  );
  assert.equal(updateCalled, false);
});
