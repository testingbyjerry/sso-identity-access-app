import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

// Load .env from workspace root if present
loadDotenv({ path: resolve(process.cwd(), '.env') });
loadDotenv({ path: resolve(process.cwd(), '../../.env') });

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters long')
    .default('sso-insecure-dev-session-secret-at-least-32-chars-key'),

  // 32-byte encryption key for AES-256-GCM (64 hex chars or raw 32+ bytes)
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY must be at least 32 characters long')
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),

  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('postgres'),
  POSTGRES_DB: z.string().default('sso_iam'),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),

  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/sso_iam'),
  DATABASE_POOL_MIN: z.coerce.number().int().nonnegative().default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  VITE_API_URL: z.string().url().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const formatted = result.error.format();
    throw new Error(`Environment validation error:\n${JSON.stringify(formatted, null, 2)}`);
  }
  return result.data;
}

// Cached parsed environment
let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv(process.env);
  }
  return cachedEnv;
}

export const serverConfig = {
  get nodeEnv() {
    return getEnv().NODE_ENV;
  },
  get isProduction() {
    return getEnv().NODE_ENV === 'production';
  },
  get isDevelopment() {
    return getEnv().NODE_ENV === 'development';
  },
  get isTest() {
    return getEnv().NODE_ENV === 'test';
  },
  get port() {
    return getEnv().PORT;
  },
  get host() {
    return getEnv().HOST;
  },
  get logLevel() {
    return getEnv().LOG_LEVEL;
  },
  get corsOrigin() {
    return getEnv().CORS_ORIGIN;
  },
  get appUrl() {
    return getEnv().APP_URL;
  },
  get sessionSecret() {
    return getEnv().SESSION_SECRET;
  },
  get encryptionKey() {
    return getEnv().ENCRYPTION_KEY;
  },
};

export const databaseConfig = {
  get url() {
    return getEnv().DATABASE_URL;
  },
  get poolMin() {
    return getEnv().DATABASE_POOL_MIN;
  },
  get poolMax() {
    return getEnv().DATABASE_POOL_MAX;
  },
  get user() {
    return getEnv().POSTGRES_USER;
  },
  get password() {
    return getEnv().POSTGRES_PASSWORD;
  },
  get host() {
    return getEnv().POSTGRES_HOST;
  },
  get port() {
    return getEnv().POSTGRES_PORT;
  },
  get database() {
    return getEnv().POSTGRES_DB;
  },
};
