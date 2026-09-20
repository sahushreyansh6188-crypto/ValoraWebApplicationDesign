import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

export const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    max: 500, // 500 requests per minute
    timeWindow: '1 minute',
    allowList: (req) => {
      // Allow internal ping / health / options
      return req.method === 'OPTIONS' || req.url === '/api/v1/health' || req.url === '/health';
    },
    errorResponseBuilder: (req, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        details: [
          {
            message: `Rate limit of ${context.max} requests per ${context.after} exceeded`,
          },
        ],
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (req.id as string) || `req_${Date.now()}`,
      },
    }),
  });
};

export default fp(rateLimitPlugin);
