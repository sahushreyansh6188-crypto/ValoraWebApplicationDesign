import cors from '@fastify/cors';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';

export const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const configuredOrigins = (env.CORS_ORIGIN || env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // In production, strictly allow only configured production origins.
  // In non-production (development/test), permit localhost fallbacks.
  const allowedOrigins =
    env.NODE_ENV === 'production'
      ? configuredOrigins
      : Array.from(new Set([...configuredOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173']));

  await fastify.register(cors, {
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
};

export default fp(corsPlugin);
