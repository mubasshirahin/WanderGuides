import test from 'node:test';
import assert from 'node:assert/strict';

import { createListGuides } from '../controllers/guideController.js';

function createResponse() {
  return {
    body: undefined,
    json(body) {
      this.body = body;
    },
  };
}

test('listGuides combines search, rating, price, and an allow-listed sort', async () => {
  let receivedSql;
  let receivedParams;
  const guides = [{ Id: 4, FullName: 'Amina Rahman' }];
  const handler = createListGuides(async (sql, params) => {
    receivedSql = sql;
    receivedParams = params;
    return guides;
  });
  const res = createResponse();

  await handler({ query: { q: 'Amina%', minRating: 4.5, maxPrice: 100, sort: 'price_asc' } }, res);

  assert.match(receivedSql, /g\.FullName LIKE @q OR g\.City LIKE @q OR g\.Bio LIKE @q/);
  assert.match(receivedSql, /g\.Rating >= @minRating/);
  assert.match(receivedSql, /COALESCE\(g\.DailyRate, g\.RatePerDay\) <= @maxPrice/);
  assert.match(receivedSql, /ORDER BY COALESCE\(g\.DailyRate, g\.RatePerDay\) ASC, g\.Id DESC/);
  assert.deepEqual(receivedParams, { q: '%Amina[%]%', minRating: 4.5, maxPrice: 100 });
  assert.deepEqual(res.body, { ok: true, guides });
});

test('listGuides uses rating order by default', async () => {
  let receivedSql;
  const handler = createListGuides(async (sql) => {
    receivedSql = sql;
    return [];
  });

  await handler({ query: {} }, createResponse());

  assert.match(receivedSql, /ORDER BY g\.Rating DESC, g\.TotalReviews DESC, g\.Id DESC/);
});
