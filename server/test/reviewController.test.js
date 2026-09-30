import test from 'node:test';
import assert from 'node:assert/strict';

import { createCreateReview, createCreateGuideReview, createGetGuideReviews } from '../controllers/reviewController.js';

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

function createQueryStub(sequence) {
  const calls = [];
  const fn = async (sql, params) => {
    calls.push({ sql, params });
    const next = sequence.shift();
    if (next instanceof Error) throw next;
    return next || [];
  };
  fn.calls = calls;
  return fn;
}

test('open review inserts without any booking (no tour needed)', async () => {
  const review = { Id: 201, BookingId: null, TouristUserId: 12, GuideId: 34, Rating: 5 };
  const stub = createQueryStub([
    [{ Id: 34 }], // Users guide exists
    [], // no existing open review
    [review], // insert
    [{ AverageRating: 5, ReviewCount: 1 }], // recalc
    [], // guides update
  ]);
  const handler = createCreateGuideReview(stub);
  const res = createResponse();

  await handler(
    { user: { id: 12, role: 'tourist' }, body: { guideId: 34, rating: 5, comment: 'Amazing!' } },
    res
  );

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { ok: true, review });
  assert.match(stub.calls[2].sql, /BookingId.*NULL|VALUES \(NULL/i);
  assert.match(stub.calls[4].sql, /UPDATE Guides/);
});

test('open review updates existing open review instead of duplicating', async () => {
  const review = { Id: 201, BookingId: null, TouristUserId: 12, GuideId: 34, Rating: 4 };
  const stub = createQueryStub([
    [{ Id: 34 }],
    [{ Id: 201 }], // existing open review
    [review], // update
    [{ AverageRating: 4, ReviewCount: 1 }],
    [],
  ]);
  const handler = createCreateGuideReview(stub);
  const res = createResponse();

  await handler(
    { user: { id: 12, role: 'tourist' }, body: { guideId: 34, rating: 4 } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, review });
  assert.match(stub.calls[2].sql, /UPDATE Reviews SET/i);
});

test('open review rejects guides (tourist only)', async () => {
  const stub = createQueryStub([]);
  const handler = createCreateGuideReview(stub);

  await assert.rejects(
    handler(
      { user: { id: 34, role: 'guide' }, body: { guideId: 34, rating: 5 } },
      createResponse()
    ),
    { message: 'Forbidden', statusCode: 403 }
  );
  assert.equal(stub.calls.length, 0);
});

test('getGuideReviews covers both Guides.Id and Users.Id', async () => {
  const rows = [{ Id: 1, Rating: 5 }];
  const stub = createQueryStub([rows]);
  const handler = createGetGuideReviews(stub);
  const res = createResponse();

  await handler({ params: { id: '9' } }, res);

  assert.deepEqual(res.body, { ok: true, reviews: rows });
  assert.match(stub.calls[0].sql, /SELECT UserID FROM Guides/);
});

test('open review falls back to live columns on invalid-column error', async () => {
  const invalidCol = Object.assign(new Error('Invalid column name'), { number: 207 });
  const review = { Id: 301, BookingId: null, TouristUserId: 12, GuideId: 34, Rating: 5 };
  // First 207 switches handler to live mode — later calls go live-only (no legacy retry)
  const stub = createQueryStub([
    [{ Id: 34 }], // Users guide exists (same both schemas)
    invalidCol, // legacy existing -> 207, then fallback:
    [], // live existing -> none
    [review], // live insert (live mode, single call)
    [{ AverageRating: 5, ReviewCount: 1 }], // live avg
    [], // guides update
  ]);
  const handler = createCreateGuideReview(stub);
  const res = createResponse();

  await handler(
    { user: { id: 12, role: 'tourist' }, body: { guideId: 34, rating: 5 } },
    res
  );

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { ok: true, review });
  assert.match(stub.calls[3].sql, /ReviewerId.*RevieweeId/s);
});

test('getGuideReviews falls back to live columns on invalid-column error', async () => {
  const invalidCol = Object.assign(new Error('Invalid column name'), { number: 207 });
  const rows = [{ Id: 2, Rating: 4 }];
  const stub = createQueryStub([invalidCol, rows]);
  const handler = createGetGuideReviews(stub);
  const res = createResponse();

  await handler({ params: { id: '9' } }, res);

  assert.deepEqual(res.body, { ok: true, reviews: rows });
  assert.match(stub.calls[1].sql, /ReviewerId/);
});
