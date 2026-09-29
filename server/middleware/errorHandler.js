export default function errorHandler(err, _req, res, _next) {
  // Log the full error for diagnostics
  console.error('[errorHandler]', err);

  const status = err && err.statusCode ? err.statusCode : 500;
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err && err.message ? err.message : 'Internal server error';
  const errors = err && err.errors ? err.errors : null;

  const payload = { ok: false, message };
  if (errors) payload.errors = errors;

  res.status(status).json(payload);
}
