import { z } from 'zod';

const clientEnvSchema = z.object({
  VITE_API_URL: z.string().url().default('http://localhost:3000'),
  MODE: z.string().default('development'),
  DEV: z.boolean().default(true),
  PROD: z.boolean().default(false),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

function parseEnv(): ClientEnv {
  const result = clientEnvSchema.safeParse(import.meta.env);
  if (!result.success) {
    console.error('Invalid frontend environment configuration:', result.error.format());
    // Fall back to safe defaults in case of mild validation failures in dev
    return {
      VITE_API_URL: (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000',
      MODE: import.meta.env.MODE || 'development',
      DEV: import.meta.env.DEV ?? true,
      PROD: import.meta.env.PROD ?? false,
    };
  }
  return result.data;
}

export const env = parseEnv();
