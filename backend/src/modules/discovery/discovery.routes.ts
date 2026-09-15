import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { DiscoveryService } from './discovery.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';

export const discoveryRoutes: FastifyPluginAsync = async (fastify) => {
  const discoveryService = new DiscoveryService(fastify.prisma);

  const handleGetFeed = async (request: any, reply: any) => {
    const query = z
      .object({
        lifestyle: z.string().optional(),
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
      })
      .parse(request.query);

    const { items, total } = await discoveryService.getDiscoveryFeed(
      request.user!.sub,
      query
    );

    const page = query.page || 1;
    const limit = query.limit || 20;

    return sendSuccess(reply, items, 200, {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    });
  };

  fastify.get('/', { preHandler: [authenticate] }, handleGetFeed);
  fastify.get('/feed', { preHandler: [authenticate] }, handleGetFeed);

  fastify.post('/pass', { preHandler: [authenticate] }, async (request, reply) => {
    const { targetProfileId } = z
      .object({ targetProfileId: z.string() })
      .parse(request.body);

    const result = await discoveryService.passProfile(request.user!.sub, targetProfileId);
    return sendSuccess(reply, result);
  });

  fastify.post('/pass/:targetProfileId', { preHandler: [authenticate] }, async (request, reply) => {
    const { targetProfileId } = request.params as { targetProfileId: string };
    const result = await discoveryService.passProfile(request.user!.sub, targetProfileId);
    return sendSuccess(reply, result);
  });
};

export default discoveryRoutes;
