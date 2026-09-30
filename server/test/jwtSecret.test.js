import test from 'node:test';
import assert from 'node:assert/strict';
import { getJwtSecret } from '../utils/jwtSecret.js';

test('JWT signing fails when no secret is configured', () => {
  const original = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  assert.throws(getJwtSecret, /JWT_SECRET must be configured/);
  if (original !== undefined) process.env.JWT_SECRET = original;
});

test('JWT secret is trimmed before use', () => {
  const original = process.env.JWT_SECRET;
  process.env.JWT_SECRET = '  a-test-secret  ';
  assert.equal(getJwtSecret(), 'a-test-secret');
  if (original === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = original;
});
