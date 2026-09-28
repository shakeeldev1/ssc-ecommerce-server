import type { StringValue } from 'ms';

export interface AppConfig {
  env: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean;
}

export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: StringValue;
  refreshSecret: string;
  refreshExpiresIn: StringValue;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface SeedConfig {
  superAdminEmail: string;
  superAdminPassword: string;
}

export interface ExternalStudentSystemConfig {
  baseUrl: string;
  apiKey: string;
}

export interface CommissionConfig {
  holdWindowDays: number;
}

/**
 * Tax rates (percent) applied at checkout. All default to 0, so tax is off
 * until the client configures real rates — the engine never invents a charge.
 * Typical Pakistan values: GST 17, PST varies by province, WHT where applicable.
 */
export interface TaxConfig {
  gstRate: number;
  pstRate: number;
  whtRate: number;
}

export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  cloudinary: CloudinaryConfig;
  seed: SeedConfig;
  externalStudentSystem: ExternalStudentSystemConfig;
  commission: CommissionConfig;
  tax: TaxConfig;
}

// Managed Postgres providers (Neon, RDS, etc.) require SSL; only plain local
// hosts don't have it. Override with DB_SSL if a host needs the opposite.
const isLocalDbHost = (host: string): boolean => host === 'localhost' || host === '127.0.0.1';

export default (): Configuration => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'ssc_db',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.DB_SSL
      ? process.env.DB_SSL === 'true'
      : !isLocalDbHost(process.env.DB_HOST ?? 'localhost'),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessExpiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as StringValue,
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as StringValue,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
  seed: {
    superAdminEmail: process.env.SEED_SUPER_ADMIN_EMAIL ?? '',
    superAdminPassword: process.env.SEED_SUPER_ADMIN_PASSWORD ?? '',
  },
  externalStudentSystem: {
    baseUrl: process.env.EXTERNAL_STUDENT_SYSTEM_BASE_URL ?? '',
    apiKey: process.env.EXTERNAL_STUDENT_SYSTEM_API_KEY ?? '',
  },
  commission: {
    holdWindowDays: parseInt(process.env.COMMISSION_HOLD_WINDOW_DAYS ?? '7', 10),
  },
  tax: {
    gstRate: parseFloat(process.env.TAX_GST_RATE ?? '0'),
    pstRate: parseFloat(process.env.TAX_PST_RATE ?? '0'),
    whtRate: parseFloat(process.env.TAX_WHT_RATE ?? '0'),
  },
});
