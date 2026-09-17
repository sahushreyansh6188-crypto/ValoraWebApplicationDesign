import cors from '@fastify/cors';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';

export const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const configuredOrigins = (env.CORS_ORIGIN || env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const defaultProductionOrigins = [
    'https://valoraconnect.vercel.app',
    'https://valora-connect.vercel.app',
  ];

  const allowedOrigins = Array.from(
    new Set([
      ...configuredOrigins,
      ...defaultProductionOrigins,
      ...(env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : []),
    ])
  );

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl, health checks)
      if (!origin) {
        cb(null, true);
        return;
      }

      // Check allowed origins list
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        cb(null, true);
        return;
      }

      // Allow any localhost / 127.0.0.1 port (3000, 5173, etc.)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        cb(null, true);
        return;
      }

      // Allow AI Studio / Cloud Run preview domains
      if (/^https:\/\/.*\.run\.app$/.test(origin) || /^https:\/\/.*\.google\.com$/.test(origin)) {
        cb(null, true);
        return;
      }

      // Allow any Vercel deployment preview domain for valoraconnect
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        cb(null, true);
        return;
      }

      cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
};

export default fp(corsPlugin);
