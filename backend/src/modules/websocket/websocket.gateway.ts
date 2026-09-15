import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket } from 'ws';
import { MessagingService } from '../messaging/messaging.service.js';

// Connection registry: userId -> Set<WebSocket>
const connectedUsers = new Map<string, Set<WebSocket>>();

export function broadcastToUser(userId: string, payload: any) {
  const sockets = connectedUsers.get(userId);
  if (!sockets) return;
  const messageStr = JSON.stringify(payload);
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(messageStr);
    }
  }
}

export const websocketGateway: FastifyPluginAsync = async (fastify) => {
  const messagingService = new MessagingService(fastify.prisma);

  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    const socket: WebSocket = connection;
    let authenticatedUserId: string | null = null;

    // 1. Authenticate WebSocket connection via token query param
    const query = req.query as { token?: string };
    const token = query?.token;

    if (!token) {
      socket.send(JSON.stringify({ error: 'Authentication required' }));
      socket.close(1008, 'Token missing');
      return;
    }

    try {
      const decoded = fastify.jwt.verify<{ sub: string }>(token);
      authenticatedUserId = decoded.sub;

      if (!connectedUsers.has(authenticatedUserId)) {
        connectedUsers.set(authenticatedUserId, new Set());
      }
      connectedUsers.get(authenticatedUserId)!.add(socket);
    } catch (err) {
      socket.send(JSON.stringify({ error: 'Invalid or expired token' }));
      socket.close(1008, 'Invalid token');
      return;
    }

    // 2. Heartbeat setup
    let isAlive = true;
    socket.on('pong', () => {
      isAlive = true;
    });

    const pingInterval = setInterval(() => {
      if (!isAlive) {
        clearInterval(pingInterval);
        socket.terminate();
        return;
      }
      isAlive = false;
      socket.ping();
    }, 30000);

    // 3. Process client messages
    socket.on('message', async (data: Buffer) => {
      if (!authenticatedUserId) return;

      try {
        const payload = JSON.parse(data.toString());
        const { action, conversationId } = payload;

        if (action === 'send_message') {
          const { text } = payload;
          if (!conversationId || !text) return;

          // Process and persist message through MessagingService
          const savedMessage = await messagingService.sendMessage(
            authenticatedUserId,
            conversationId,
            text
          );

          // Find recipient
          const conversation = await fastify.prisma.conversation.findUnique({
            where: { id: conversationId },
          });

          if (conversation) {
            const recipientId =
              conversation.user1Id === authenticatedUserId
                ? conversation.user2Id
                : conversation.user1Id;

            // Broadcast to sender (confirming with senderId: "me")
            broadcastToUser(authenticatedUserId, {
              type: 'message:received',
              event: 'new_message',
              conversationId,
              payload: savedMessage,
              message: savedMessage,
            });

            // Broadcast to recipient (with real senderId)
            const recipientPayload = {
              ...savedMessage,
              senderId: authenticatedUserId,
            };
            broadcastToUser(recipientId, {
              type: 'message:received',
              event: 'new_message',
              conversationId,
              payload: recipientPayload,
              message: recipientPayload,
            });
          }
        } else if (action === 'mark_read') {
          if (!conversationId) return;
          await messagingService.markConversationAsRead(
            authenticatedUserId,
            conversationId
          );

          // Find other participant and broadcast read receipt
          const conversation = await fastify.prisma.conversation.findUnique({
            where: { id: conversationId },
          });

          if (conversation) {
            const recipientId =
              conversation.user1Id === authenticatedUserId
                ? conversation.user2Id
                : conversation.user1Id;

            const readPayload = {
              conversationId,
              readBy: authenticatedUserId,
              readAt: new Date().toISOString(),
            };

            broadcastToUser(recipientId, {
              type: 'messages:read',
              event: 'messages_read',
              conversationId,
              readBy: authenticatedUserId,
              readAt: readPayload.readAt,
              payload: readPayload,
            });
          }
        }
      } catch (err) {
        socket.send(JSON.stringify({ error: 'Failed to process message' }));
      }
    });

    // 4. Handle disconnect
    socket.on('close', () => {
      clearInterval(pingInterval);
      if (authenticatedUserId && connectedUsers.has(authenticatedUserId)) {
        const userSockets = connectedUsers.get(authenticatedUserId)!;
        userSockets.delete(socket);
        if (userSockets.size === 0) {
          connectedUsers.delete(authenticatedUserId);
        }
      }
    });
  });

  // Graceful teardown hook for all active WebSocket connections on shutdown
  fastify.addHook('onClose', async () => {
    for (const sockets of connectedUsers.values()) {
      for (const ws of sockets) {
        try {
          ws.close(1001, 'Server shutting down');
        } catch {
          // Ignore close errors during server teardown
        }
      }
    }
    connectedUsers.clear();
  });
};

export default websocketGateway;
