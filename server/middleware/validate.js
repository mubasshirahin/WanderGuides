import { z } from 'zod';
import AppError from '../utils/AppError.js';

const optionalTrimmedString = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional();

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required').max(100),
  email: z.string().trim().min(1, 'email is required').email('email must be a valid email address'),
  password: z.string().min(6, 'password must be at least 6 characters'),
  role: z.enum(['tourist', 'guide'], {
    errorMap: () => ({ message: "role must be either 'tourist' or 'guide'" }),
  }),
  phone: optionalTrimmedString(30),
  avatarUrl: optionalTrimmedString(500),
  bio: optionalTrimmedString(1000),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'email is required').email('email must be a valid email address'),
  password: z.string().min(1, 'password is required'),
}).strict();

const validDateString = (label) =>
  z.string().trim().min(1, `${label} is required`).refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    { message: `${label} must be a valid date` }
  );

export const bookingSchema = z.object({
  guideId: z.coerce.number().int('guideId must be an integer').positive('guideId must be a positive number'),
  startDate: validDateString('startDate'),
  endDate: validDateString('endDate'),
  notes: optionalTrimmedString(500),
}).strict();

function toFieldErrors(issues) {
  return issues.map((issue) => ({
    field: issue.path.length ? issue.path.join('.') : 'body',
    message: issue.message,
  }));
}

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(new AppError('Validation failed', 400, toFieldErrors(result.error.issues)));
    }

    req.body = result.data;
    return next();
  };
}
