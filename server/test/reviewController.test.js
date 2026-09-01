import test from 'node:test';
import assert from 'node:assert/strict';

import { createCreateReview } from '../controllers/reviewController.js';

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
    },
  };
}

function createPool(responses) {
  const calls = [];
  const transaction = {
    began: false,
    committed: false,
    rolledBack: false,
    async begin() {
      this.began = true;
    },
    request() {
      const inputs = {};
      return {
        input(name, value) {
          inputs[name] = value;
          return this;
        },
        async query(sql) {
          calls.push({ sql, inputs });
          return { recordset: responses.shift() || [] };
        },
      };
    },
    async commit() {
      this.committed = true;
    },
    async rollback() {
      this.rolledBack = true;
    },
  };

  return { calls, transaction, pool: { transaction: () => transaction } };
}

test('rejects uncompleted bookings with 403 and rolls back', async () => {
  const fake = createPool([[{ Id: 7, TouristUserId: 12, GuideId: 34, Status: 'confirmed' }]]);
  const handler = createCreateReview(async () => fake.pool);

  await assert.rejects(
    handler(
      { user: { id: 12, role: 'tourist' }, body: { bookingId: 7, rating: 5 } },
      createResponse()
    ),
    { message: 'You can only review completed bookings', statusCode: 403 }
  );
  assert.equal(fake.transaction.rolledBack, true);
  assert.equal(fake.calls.length, 1);
});

test('rejects duplicate reviews with 409 and rolls back', async () => {
  const fake = createPool([
    [{ Id: 7, TouristUserId: 12, GuideId: 34, Status: 'completed' }],
    [{ Id: 99 }],
  ]);
  const handler = createCreateReview(async () => fake.pool);

  await assert.rejects(
    handler(
      { user: { id: 12, role: 'tourist' }, body: { bookingId: 7, rating: 5 } },
      createResponse()
    ),
    { message: 'You have already reviewed this booking', statusCode: 409 }
  );
  assert.equal(fake.transaction.rolledBack, true);
  assert.equal(fake.calls.length, 2);
});

test('inserts a review and updates the guide average in one transaction', async () => {
  const review = { Id: 100, BookingId: 7, TouristUserId: 12, GuideId: 34, Rating: 5 };
  const fake = createPool([
    [{ Id: 7, TouristUserId: 12, GuideId: 34, Status: 'completed' }],
    [],
    [review],
    [{ AverageRating: 4.5, ReviewCount: 2 }],
    [],
  ]);
  const handler = createCreateReview(async () => fake.pool);
  const res = createResponse();

  await handler(
    { user: { id: 12, role: 'tourist' }, body: { bookingId: 7, rating: 5, comment: 'Great' } },
    res
  );

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { ok: true, review });
  assert.equal(fake.transaction.committed, true);
  assert.equal(fake.transaction.rolledBack, false);
  assert.match(fake.calls[2].sql, /INSERT INTO Reviews \(BookingId, TouristUserId, GuideId/);
  assert.match(fake.calls[4].sql, /UPDATE Guides/);
  assert.equal(fake.calls[4].inputs.rating, '4.50');
  assert.equal(fake.calls[4].inputs.reviewCount, 2);
});

test('rejects non-tourists before opening a transaction', async () => {
  let poolRequested = false;
  const handler = createCreateReview(async () => {
    poolRequested = true;
    return createPool([]).pool;
  });

  await assert.rejects(
    handler(
      { user: { id: 34, role: 'guide' }, body: { bookingId: 7, rating: 5 } },
      createResponse()
    ),
    { message: 'Forbidden', statusCode: 403 }
  );
  assert.equal(poolRequested, false);
});
