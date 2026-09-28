import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),
  // Unset = auto-detect from DB_HOST (on for managed hosts, off for
  // localhost/127.0.0.1). Set explicitly to force either way.
  DB_SSL: Joi.boolean().optional(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Left optional until the client supplies real credentials — MediaService
  // fails with a clear error only when an upload is actually attempted.
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),

  // Optional: bootstraps one Super Admin account on startup if set and not
  // already present. Leave unset in shared/production environments.
  SEED_SUPER_ADMIN_EMAIL: Joi.string().allow('').default(''),
  SEED_SUPER_ADMIN_PASSWORD: Joi.string().allow('').default(''),

  // External Student Smart Card system (see EXTERNAL_INTEGRATION_SPEC.md).
  // Left optional until it's deployed — card-activation.module.ts falls
  // back to MockStudentSyncProvider whenever either is blank.
  EXTERNAL_STUDENT_SYSTEM_BASE_URL: Joi.string().allow('').default(''),
  EXTERNAL_STUDENT_SYSTEM_API_KEY: Joi.string().allow('').default(''),

  // How long a normally-earned commission is held before release (Phase 7's
  // return-window requirement). e2e tests set this to 0 for determinism.
  COMMISSION_HOLD_WINDOW_DAYS: Joi.number().min(0).default(7),

  // Tax rates (percent), applied at checkout. Default 0 = tax off until the
  // client supplies real rates. Typical PK: GST 17, PST provincial, WHT where due.
  TAX_GST_RATE: Joi.number().min(0).max(100).default(0),
  TAX_PST_RATE: Joi.number().min(0).max(100).default(0),
  TAX_WHT_RATE: Joi.number().min(0).max(100).default(0),
});
