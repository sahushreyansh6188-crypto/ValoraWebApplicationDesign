import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('8080').transform((v) => parseInt(v, 10)),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/api/v1'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@127.0.0.1:5432/valora?schema=public'),
  DIRECT_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().default('valora_development_jwt_access_secret_min_32_characters_long'),
  JWT_REFRESH_SECRET: z.string().default('valora_development_jwt_refresh_secret_min_32_characters_long'),
  COOKIE_SECRET: z.string().default('valora_development_cookie_secret_min_32_characters_long'),
  ENFORCE_QUOTAS: z.string().default('false').transform((v) => v === 'true'),
  STRIPE_SECRET_KEY: z.string().default('sk_test_mock_secret_key'),
  STRIPE_WEBHOOK_SECRET: z.string().default('whsec_mock_webhook_secret'),
  STRIPE_CONNECT_PRICE_ID: z.string().default('price_mock_connect_14'),
  STRIPE_ANNUAL_PRICE_ID: z.string().default('price_mock_annual_99'),
  MEDIA_CDN_URL: z.string().default('https://images.unsplash.com'),
  EMAIL_FROM: z.string().default('VALORA <no-reply@valora.example.com>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
