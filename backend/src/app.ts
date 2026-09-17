import fastify, { type FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import websocket from '@fastify/websocket';
import prismaPlugin from './plugins/prisma.js';
import corsPlugin from './plugins/cors.js';
import jwtPlugin from './plugins/jwt.js';
import rateLimitPlugin from './plugins/rateLimit.js';
import { requestLogger } from './middleware/requestLogger.js';

import authRoutes from './modules/auth/auth.routes.js';
import profilesRoutes from './modules/profiles/profiles.routes.js';
import discoveryRoutes from './modules/discovery/discovery.routes.js';
import connectionsRoutes from './modules/connections/connections.routes.js';
import messagingRoutes from './modules/messaging/messaging.routes.js';
import websocketGateway from './modules/websocket/websocket.gateway.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import safetyRoutes from './modules/safety/safety.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';

import { AppError } from './utils/errors.js';
import { sendError, sendSuccess } from './utils/response.js';
import { env } from './config/env.js';

export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
    genReqId: () => `req_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
    trustProxy: true,
  });

  // 1. Plugins
  app.register(websocket);
  app.register(corsPlugin);
  app.register(jwtPlugin);
  app.register(prismaPlugin);
  app.register(rateLimitPlugin);

  // 2. Request hooks
  app.addHook('onRequest', requestLogger);

  // 3. Health Check
  app.get('/health', async (request, reply) => {
    let dbStatus = 'connected';
    try {
      await app.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      dbStatus = `disconnected: ${(err as Error).message}`;
    }

    return sendSuccess(reply, {
      status: 'healthy',
      service: 'valora-backend',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // 4. API Routes (/api/v1)
  app.register(
    async (api) => {
      api.get('/health', async (_req, reply) => {
        let dbStatus = 'connected';
        try {
          await app.prisma.$queryRaw`SELECT 1`;
        } catch (err) {
          dbStatus = `disconnected: ${(err as Error).message}`;
        }
        return sendSuccess(reply, {
          status: 'healthy',
          service: 'valora-backend',
          database: dbStatus,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        });
      });
      api.register(authRoutes, { prefix: '/auth' });
      api.register(profilesRoutes, { prefix: '/profiles' });
      api.register(profilesRoutes, { prefix: '/profile' });
      api.register(discoveryRoutes, { prefix: '/discovery' });
      api.register(connectionsRoutes, { prefix: '/connections' });
      api.register(messagingRoutes, { prefix: '/messaging' });
      api.register(messagingRoutes);
      api.register(notificationsRoutes, { prefix: '/notifications' });
      api.register(settingsRoutes, { prefix: '/settings' });
      api.register(settingsRoutes, { prefix: '/users' });
      api.register(safetyRoutes, { prefix: '/safety' });
      api.register(adminRoutes, { prefix: '/admin' });
      api.register(billingRoutes, { prefix: '/billing' });
    },
    { prefix: env.API_PREFIX }
  );

  // 5. WebSocket Gateway
  app.register(websocketGateway);

  // 6. Global Error Handler
  app.setErrorHandler((error, request, reply) => {
    // Custom AppError
    if (error instanceof AppError) {
      return sendError(reply, error);
    }

    // Zod Schema Validation Error
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return sendError(reply, AppError.badRequest('Validation failed', details));
    }

    // Fastify native schema errors
    const anyError = error as any;
    if (anyError.validation) {
      const details = (anyError.validation as any[]).map((v: any) => ({
        field: v.instancePath || '',
        message: v.message || 'Invalid field',
      }));
      return sendError(reply, AppError.badRequest('Validation failed', details));
    }

    // Log internal unhandled error
    request.log.error(error, 'Unhandled Internal Server Error');

    const rawMessage = anyError?.message || 'Internal Server Error';
    const isDbError =
      rawMessage.includes("Can't reach database server") ||
      rawMessage.includes('P1001') ||
      rawMessage.includes('DATABASE_URL');
    const friendlyMessage = isDbError
      ? 'Database connection failed. Please ensure DATABASE_URL is set in Render Environment Variables.'
      : rawMessage;

    return sendError(reply, AppError.internal(friendlyMessage));
  });

  // 7. Not Found Handler
  app.setNotFoundHandler((request, reply) => {
    return sendError(reply, AppError.notFound(`Route ${request.method} ${request.url} not found`));
  });

  return app;
}
