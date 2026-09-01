import test from 'node:test';
import assert from 'node:assert/strict';

import { createGetGuideReviews } from '../controllers/reviewController.js';

function createResponse() {
  return {
    body: undefined,
    json(body) {
      this.body = body;
    },
  };
}

test('getGuideReviews returns review details for the requested guide', async () => {
  const reviews = [
    {
      Id: 12,
      Rating: 5,
      Comment: 'Excellent guide',
      CreatedAt: '2026-08-20T10:00:00.000Z',
      TouristName: 'Amina Rahman',
      TouristAvatarUrl: 'https://example.test/amina.jpg',
    },
  ];
  let receivedSql;
  let receivedParams;
  const handler = createGetGuideReviews(async (sql, params) => {
    receivedSql = sql;
    receivedParams = params;
    return reviews;
  });
  const res = createResponse();

  await handler({ params: { id: '42' } }, res);

  assert.deepEqual(receivedParams, { guideId: 42 });
  assert.match(receivedSql, /INNER JOIN Users tourist ON tourist\.Id = r\.TouristUserId/);
  assert.match(receivedSql, /ORDER BY r\.CreatedAt DESC/);
  assert.deepEqual(res.body, { ok: true, reviews });
});

test('getGuideReviews returns an empty reviews array when the guide has no reviews', async () => {
  const handler = createGetGuideReviews(async () => []);
  const res = createResponse();

  await handler({ params: { id: '42' } }, res);

  assert.deepEqual(res.body, { ok: true, reviews: [] });
});

test('getGuideReviews rejects invalid guide IDs before querying the database', async () => {
  let queryCalled = false;
  const handler = createGetGuideReviews(async () => {
    queryCalled = true;
    return [];
  });

  await assert.rejects(
    handler({ params: { id: 'not-an-id' } }, createResponse()),
    { message: 'Invalid ID', statusCode: 400 }
  );
  assert.equal(queryCalled, false);
});
