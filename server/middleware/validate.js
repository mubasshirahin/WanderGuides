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
  role: z.enum(['tourist', 'guide']).optional(),
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

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(100).optional(),
  phone: optionalTrimmedString(30),
  avatarUrl: optionalTrimmedString(500),
  bio: optionalTrimmedString(2000),
  city: optionalTrimmedString(100),
  specialties: optionalTrimmedString(255),
  languages: optionalTrimmedString(255),
  ratePerDay: z.coerce.number().min(0).max(99999).optional(),
}).strict();

export const touristProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(100).optional(),
  phone: optionalTrimmedString(30),
  avatarUrl: optionalTrimmedString(500),
  bio: optionalTrimmedString(2000),
  city: optionalTrimmedString(100),
  country: optionalTrimmedString(100),
  languages: optionalTrimmedString(255),
  travelInterests: optionalTrimmedString(2000),
  emergencyContactName: optionalTrimmedString(100),
  emergencyContactPhone: optionalTrimmedString(50),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
}).strict();

export const customTourRequestSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(150),
  destination: z.string().trim().min(1, 'destination is required').max(100),
  startDate: validDateString('startDate'),
  endDate: validDateString('endDate'),
  groupSize: z.coerce.number().int().min(1, 'groupSize must be at least 1').max(50),
  budget: z.coerce.number().min(0, 'budget must be non-negative'),
  description: optionalTrimmedString(4000),
}).strict();

export const tourBidSchema = z.object({
  offeredPrice: z.coerce.number().min(0, 'offeredPrice must be non-negative'),
  proposalMessage: optionalTrimmedString(4000),
}).strict();

export const exploreQuerySchema = z.object({
  location: z.string().trim().max(100).optional(),
  keyword: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export const guidesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().min(0).max(99999).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'rating']).default('rating'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const directBookingSchema = bookingSchema;

export const guideBidSchema = z.object({
  guideId: z.coerce.number().int('guideId must be an integer').positive('guideId must be a positive number'),
  offeredPrice: z.coerce.number().min(0, 'offeredPrice must be non-negative'),
  startDate: validDateString('startDate'),
  endDate: validDateString('endDate'),
  message: optionalTrimmedString(2000),
}).strict();

export const guideSelfProfileSchema = z.object({
  bio: optionalTrimmedString(2000),
  city: optionalTrimmedString(100),
  specialties: optionalTrimmedString(255),
  languages: optionalTrimmedString(255),
  hourlyRate: z.coerce.number().min(0).max(99999).optional(),
  dailyRate: z.coerce.number().min(0).max(99999).optional(),
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

/** Zod validation for req.query (coerces defaults too). */
export function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return next(new AppError('Validation failed', 400, toFieldErrors(result.error.issues)));
    }

    req.query = result.data;
    return next();
  };
}
