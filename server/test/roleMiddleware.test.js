import test from 'node:test';
import assert from 'node:assert/strict';
import { requireRole } from '../middleware/role.js';

test('admin-only route guard rejects a tourist', () => {
  let error;
  requireRole('admin')({ user: { id: 5, role: 'tourist' } }, {}, (nextError) => { error = nextError; });
  assert.equal(error?.statusCode, 403);
});

test('admin-only route guard accepts an admin', () => {
  let called = false;
  requireRole('admin')({ user: { id: 1, role: 'admin' } }, {}, (error) => { called = !error; });
  assert.equal(called, true);
});
