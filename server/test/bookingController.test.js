import test from 'node:test';
import assert from 'node:assert/strict';

import { createUpdateBookingStatus, createUpdatePaymentStatus } from '../controllers/bookingController.js';

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

test('guide can mark their confirmed booking as paid', async () => {
  const calls = [];
  const handler = createUpdatePaymentStatus(async (sql, params) => {
    calls.push({ sql, params });
    return calls.length === 1
      ? [{ Id: 7, GuideId: 34, Status: 'confirmed', PaymentStatus: 'unpaid' }]
      : [{ Id: 7, PaymentStatus: 'paid' }];
  });
  const res = createResponse();

  await handler(
    { params: { id: '7' }, body: { paymentStatus: 'paid' }, user: { id: 34, role: 'guide' } },
    res
  );

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].params, { bookingId: 7, nextStatus: 'paid', currentStatus: 'unpaid' });
  assert.match(calls[1].sql, /UPDATE Bookings/);
  assert.deepEqual(res.body, { ok: true, paymentStatus: 'paid' });
});

test('guide cannot mark another guide booking as paid', async () => {
  let updateCalled = false;
  const handler = createUpdatePaymentStatus(async (sql) => {
    if (/UPDATE Bookings/.test(sql)) updateCalled = true;
    return [{ Id: 7, GuideId: 34, Status: 'completed', PaymentStatus: 'unpaid' }];
  });

  await assert.rejects(
    handler(
      { params: { id: '7' }, body: { paymentStatus: 'paid' }, user: { id: 99, role: 'guide' } },
      createResponse()
    ),
    { message: 'Forbidden', statusCode: 403 }
  );
  assert.equal(updateCalled, false);
});

test('guide cannot probe another booking payment state through an idempotent update', async () => {
  let updateCalled = false;
  const handler = createUpdatePaymentStatus(async (sql) => {
    if (/UPDATE Bookings/.test(sql)) updateCalled = true;
    return [{ Id: 7, GuideId: 34, Status: 'completed', PaymentStatus: 'paid' }];
  });

  await assert.rejects(
    handler(
      { params: { id: '7' }, body: { paymentStatus: 'paid' }, user: { id: 99, role: 'guide' } },
      createResponse()
    ),
    { message: 'Forbidden', statusCode: 403 }
  );
  assert.equal(updateCalled, false);
});

test('admin can refund a paid booking only', async () => {
  const handler = createUpdatePaymentStatus(async (_sql, params) =>
    params.nextStatus === 'refunded'
      ? [{ Id: 7, PaymentStatus: 'refunded' }]
      : [{ Id: 7, GuideId: 34, Status: 'completed', PaymentStatus: 'paid' }]
  );
  const res = createResponse();

  await handler(
    { params: { id: '7' }, body: { paymentStatus: 'refunded' }, user: { id: 1, role: 'admin' } },
    res
  );

  assert.deepEqual(res.body, { ok: true, paymentStatus: 'refunded' });
});

test('admin cannot refund an unpaid booking', async () => {
  let updateCalled = false;
  const handler = createUpdatePaymentStatus(async (sql) => {
    if (/UPDATE Bookings/.test(sql)) updateCalled = true;
    return [{ Id: 7, GuideId: 34, Status: 'completed', PaymentStatus: 'unpaid' }];
  });

  await assert.rejects(
    handler(
      { params: { id: '7' }, body: { paymentStatus: 'refunded' }, user: { id: 1, role: 'admin' } },
      createResponse()
    ),
    { message: 'Only paid bookings can be refunded', statusCode: 400 }
  );
  assert.equal(updateCalled, false);
});

test('tourists cannot edit booking payment status', async () => {
  let queryCalled = false;
  const handler = createUpdatePaymentStatus(async () => {
    queryCalled = true;
    return [];
  });

  await assert.rejects(
    handler(
      { params: { id: '7' }, body: { paymentStatus: 'paid' }, user: { id: 12, role: 'tourist' } },
      createResponse()
    ),
    { message: 'Forbidden', statusCode: 403 }
  );
  assert.equal(queryCalled, false);
});
