export default function errorHandler(err, _req, res, _next) {
  // Log the full error for diagnostics
  console.error('[errorHandler]', err);

  const status = err && err.statusCode ? err.statusCode : 500;
  const message = err && err.message ? err.message : 'Internal server error';

  res.status(status).json({ ok: false, message });
}
