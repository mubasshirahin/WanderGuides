import AppError from '../utils/AppError.js';

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    const user = req.user;
    if (!user) return next(new AppError('Unauthorized', 401));
    if (!allowedRoles.includes(user.role)) return next(new AppError('Forbidden', 403));
    return next();
  };
}
