import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { MessagingService } from './messaging.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';

import { broadcastToUser } from '../websocket/websocket.gateway.js';

export const messagingRoutes: FastifyPluginAsync = async (fastify) => {
  const messagingService = new MessagingService(fastify.prisma);

  fastify.get('/conversations', { preHandler: [authenticate] }, async (request, reply) => {
    const conversations = await messagingService.getConversations(request.user!.sub);
    return sendSuccess(reply, conversations);
  });

  fastify.get('/conversations/:id/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const messages = await messagingService.getConversationMessages(request.user!.sub, id);
    return sendSuccess(reply, messages);
  });

  fastify.post('/conversations/:id/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { text } = z.object({ text: z.string().min(1) }).parse(request.body);
    const message = await messagingService.sendMessage(request.user!.sub, id, text);

    // Broadcast live event to conversation recipient if connected to WebSocket
    const conversation = await fastify.prisma.conversation.findUnique({
      where: { id },
    });
    if (conversation) {
      const recipientId =
        conversation.user1Id === request.user!.sub
          ? conversation.user2Id
          : conversation.user1Id;

      const recipientPayload = {
        ...message,
        senderId: request.user!.sub,
      };

      broadcastToUser(recipientId, {
        type: 'message:received',
        event: 'new_message',
        conversationId: id,
        payload: recipientPayload,
        message: recipientPayload,
      });
    }

    return sendSuccess(reply, message, 201);
  });

  const handleMarkRead = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const result = await messagingService.markConversationAsRead(request.user!.sub, id);

    const conversation = await fastify.prisma.conversation.findUnique({
      where: { id },
    });
    if (conversation) {
      const recipientId =
        conversation.user1Id === request.user!.sub
          ? conversation.user2Id
          : conversation.user1Id;

      const readPayload = {
        conversationId: id,
        readBy: request.user!.sub,
        readAt: new Date().toISOString(),
      };

      broadcastToUser(recipientId, {
        type: 'messages:read',
        event: 'messages_read',
        conversationId: id,
        readBy: request.user!.sub,
        readAt: readPayload.readAt,
        payload: readPayload,
      });
    }

    return sendSuccess(reply, result);
  };

  fastify.patch('/conversations/:id/read', { preHandler: [authenticate] }, handleMarkRead);
  fastify.post('/conversations/:id/read', { preHandler: [authenticate] }, handleMarkRead);
};

export default messagingRoutes;
