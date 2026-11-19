import { defineConfig } from 'drizzle-kit';
import { databaseConfig } from '@sso/config';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseConfig.url,
  },
  verbose: true,
  strict: true,
});
