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
  const queries = [];
  const guides = [{ Id: 4, FullName: 'Amina Rahman' }];
  const handler = createListGuides(async (sql, params) => {
    queries.push({ sql, params });
    return sql.includes('COUNT(*)') ? [{ total: 23 }] : guides;
  });
  const res = createResponse();

  await handler({ query: { q: 'Amina%', minRating: 4.5, maxPrice: 100, sort: 'price_asc', page: 2, limit: 10 } }, res);

  const selectQuery = queries.find(({ sql }) => !sql.includes('COUNT(*)'));
  assert.match(selectQuery.sql, /g\.FullName LIKE @q OR g\.City LIKE @q OR g\.Bio LIKE @q/);
  assert.match(selectQuery.sql, /g\.Rating >= @minRating/);
  assert.match(selectQuery.sql, /COALESCE\(g\.DailyRate, g\.RatePerDay\) <= @maxPrice/);
  assert.match(selectQuery.sql, /ORDER BY COALESCE\(g\.DailyRate, g\.RatePerDay\) ASC, g\.Id DESC/);
  assert.match(selectQuery.sql, /OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY/);
  assert.deepEqual(selectQuery.params, { q: '%Amina[%]%', minRating: 4.5, maxPrice: 100, offset: 10, limit: 10 });
  assert.deepEqual(res.body, { data: guides, total: 23, page: 2, limit: 10, totalPages: 3 });
});

test('listGuides defaults to the first page with ten results per page', async () => {
  const queries = [];
  const handler = createListGuides(async (sql, params) => {
    queries.push({ sql, params });
    return sql.includes('COUNT(*)') ? [{ total: 0 }] : [];
  });
  const res = createResponse();

  await handler({ query: {} }, res);

  const selectQuery = queries.find(({ sql }) => !sql.includes('COUNT(*)'));
  assert.match(selectQuery.sql, /ORDER BY g\.Rating DESC, g\.TotalReviews DESC, g\.Id DESC/);
  assert.deepEqual(selectQuery.params, { q: null, minRating: null, maxPrice: null, offset: 0, limit: 10 });
  assert.deepEqual(res.body, { data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
});
