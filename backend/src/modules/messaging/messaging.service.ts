import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../utils/errors.js';
import {
  serializeMessage,
  serializeConversation,
} from '../../serialization/messageSerializer.js';
import { serializeProfile } from '../../serialization/profileSerializer.js';

export class MessagingService {
  constructor(private prisma: PrismaClient) {}

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user1: {
          include: {
            profile: {
              include: {
                photos: { orderBy: { displayOrder: 'asc' } },
                attributes: true,
              },
            },
          },
        },
        user2: {
          include: {
            profile: {
              include: {
                photos: { orderBy: { displayOrder: 'asc' } },
                attributes: true,
              },
            },
          },
        },
        match: true,
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return conversations.map((conv) => {
      const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
      const otherProfile = serializeProfile(otherUser.profile, conv.match?.compatibilityScore || 80);
      return serializeConversation(conv, userId, otherProfile);
    });
  }

  async getConversationMessages(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw AppError.forbidden('You are not a participant in this conversation');
    }

    return (conversation.messages || []).map((m) => serializeMessage(m, userId));
  }

  async sendMessage(userId: string, conversationId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      throw AppError.badRequest('Message text cannot be empty');
    }
    if (trimmed.length > 4000) {
      throw AppError.badRequest('Message cannot exceed 4000 characters');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });

    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw AppError.forbidden('You are not a participant in this conversation');
    }

    const recipientId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;

    // Verify block status
    const blockExists = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: recipientId },
          { blockerId: recipientId, blockedId: userId },
        ],
      },
    });

    if (blockExists) {
      throw AppError.forbidden('Cannot send message to this user');
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          text: trimmed,
          read: false,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
      this.prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'message',
          text: `You have a new message`,
          relatedProfileId: (await this.prisma.profile.findUnique({ where: { userId } }))?.id,
        },
      }),
    ]);

    return serializeMessage(message, userId);
  }

  async markConversationAsRead(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw AppError.forbidden('You are not a participant in this conversation');
    }

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { read: true };
  }
}
