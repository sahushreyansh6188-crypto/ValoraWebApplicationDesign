import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: fastify.log.level === 'debug' ? ['query', 'error', 'warn'] : ['error'],
  });

  try {
    await prisma.$connect();
    fastify.log.info('Connected to PostgreSQL via Prisma');
  } catch (err) {
    fastify.log.warn(`Prisma could not connect on startup: ${(err as Error).message}. Queries will attempt connection on demand.`);
  }

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async (server) => {
    try {
      await server.prisma.$disconnect();
    } catch {
      // Ignore disconnect errors during teardown
    }
  });
};

export default fp(prismaPlugin);
