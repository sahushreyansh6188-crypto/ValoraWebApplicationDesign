import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { SafetyService } from './safety.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';

export const safetyRoutes: FastifyPluginAsync = async (fastify) => {
  const safetyService = new SafetyService(fastify.prisma);

  fastify.post('/block', { preHandler: [authenticate] }, async (request, reply) => {
    const body = z
      .object({
        targetIdentifier: z.string().optional(),
        targetUserId: z.string().optional(),
        reason: z.string().optional(),
      })
      .refine((d) => d.targetIdentifier || d.targetUserId, {
        message: 'targetIdentifier or targetUserId is required',
      })
      .parse(request.body);

    const targetId = (body.targetIdentifier || body.targetUserId)!;
    const result = await safetyService.blockUser(request.user!.sub, targetId);
    return sendSuccess(reply, result);
  });

  fastify.post('/unblock', { preHandler: [authenticate] }, async (request, reply) => {
    const body = z
      .object({
        targetIdentifier: z.string().optional(),
        targetUserId: z.string().optional(),
      })
      .refine((d) => d.targetIdentifier || d.targetUserId, {
        message: 'targetIdentifier or targetUserId is required',
      })
      .parse(request.body);

    const targetId = (body.targetIdentifier || body.targetUserId)!;
    const result = await safetyService.unblockUser(request.user!.sub, targetId);
    return sendSuccess(reply, result);
  });

  fastify.get('/blocked', { preHandler: [authenticate] }, async (request, reply) => {
    const blocked = await safetyService.getBlockedUsers(request.user!.sub);
    return sendSuccess(reply, blocked);
  });

  fastify.delete('/blocked/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await safetyService.unblockUser(request.user!.sub, id);
    return sendSuccess(reply, result);
  });

  fastify.post('/report', { preHandler: [authenticate] }, async (request, reply) => {
    const body = z
      .object({
        reportedIdentifier: z.string().optional(),
        targetUserId: z.string().optional(),
        reason: z.string().min(1),
        description: z.string().optional(),
      })
      .refine((d) => d.reportedIdentifier || d.targetUserId, {
        message: 'reportedIdentifier or targetUserId is required',
      })
      .parse(request.body);

    const reportedIdentifier = (body.reportedIdentifier || body.targetUserId)!;
    const result = await safetyService.submitReport(request.user!.sub, {
      reportedIdentifier,
      reason: body.reason,
      description: body.description,
    });
    return sendSuccess(reply, result, 200);
  });

  fastify.post('/unmatch', { preHandler: [authenticate] }, async (request, reply) => {
    const body = z
      .object({
        targetUserId: z.string().optional(),
        targetIdentifier: z.string().optional(),
        matchId: z.string().optional(),
      })
      .refine((d) => d.targetUserId || d.targetIdentifier || d.matchId, {
        message: 'targetUserId, targetIdentifier, or matchId required',
      })
      .parse(request.body);

    const target = (body.targetUserId || body.targetIdentifier || body.matchId)!;
    const result = await safetyService.unmatch(request.user!.sub, target);
    return sendSuccess(reply, result);
  });

  fastify.post('/matches/:id/unmatch', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await safetyService.unmatch(request.user!.sub, id);
    return sendSuccess(reply, result);
  });
};

export default safetyRoutes;
