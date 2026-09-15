import type { FastifyPluginAsync } from 'fastify';
import { NotificationsService } from './notifications.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  const notificationsService = new NotificationsService(fastify.prisma);

  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const notifications = await notificationsService.getNotifications(request.user!.sub);
    return sendSuccess(reply, notifications);
  });

  fastify.patch('/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await notificationsService.markAsRead(request.user!.sub, id);
    return sendSuccess(reply, result);
  });

  fastify.post('/mark-all-read', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await notificationsService.markAllAsRead(request.user!.sub);
    return sendSuccess(reply, result);
  });
};

export default notificationsRoutes;
