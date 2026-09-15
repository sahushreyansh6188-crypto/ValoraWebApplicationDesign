import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ConnectionsService } from './connections.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';

export const connectionsRoutes: FastifyPluginAsync = async (fastify) => {
  const connectionsService = new ConnectionsService(fastify.prisma);

  const handleRequest = async (request: any, reply: any) => {
    const body = z
      .object({
        targetProfileId: z.string().optional(),
        targetUserId: z.string().optional(),
      })
      .refine((d) => d.targetProfileId || d.targetUserId, {
        message: 'targetUserId or targetProfileId required',
      })
      .parse(request.body);

    const targetId = (body.targetProfileId || body.targetUserId)!;
    const result = await connectionsService.requestConnection(request.user!.sub, targetId);
    return sendSuccess(reply, result);
  };

  fastify.post('/request', { preHandler: [authenticate] }, handleRequest);
  fastify.post('/reach-out', { preHandler: [authenticate] }, handleRequest);

  const handleMatches = async (request: any, reply: any) => {
    const matches = await connectionsService.getMatches(request.user!.sub);
    return sendSuccess(reply, matches);
  };

  fastify.get('/matches', { preHandler: [authenticate] }, handleMatches);
};

export default connectionsRoutes;
