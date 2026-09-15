import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

export const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    max: 100, // 100 requests per minute by default
    timeWindow: '1 minute',
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
