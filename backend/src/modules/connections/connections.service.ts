import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../utils/errors.js';
import { serializeProfile } from '../../serialization/profileSerializer.js';

export class ConnectionsService {
  constructor(private prisma: PrismaClient) {}

  async requestConnection(userId: string, targetIdentifier: string) {
    if (userId === targetIdentifier) {
      throw AppError.badRequest('You cannot connect with your own profile');
    }

    // Resolve target user ID if profile ID was provided
    let targetUserId = targetIdentifier;
    const targetProfile = await this.prisma.profile.findFirst({
      where: {
        OR: [{ id: targetIdentifier }, { userId: targetIdentifier }],
      },
    });

    if (targetProfile) {
      targetUserId = targetProfile.userId;
    }

    if (userId === targetUserId) {
      throw AppError.badRequest('You cannot connect with your own profile');
    }

    // Check if target has blocked current user or vice versa
    const blockExists = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: userId },
        ],
      },
    });

    if (blockExists) {
      throw AppError.forbidden('Cannot connect with this member');
    }

    // Check if reciprocal connection request already exists from target to current user
    const reciprocal = await this.prisma.connectionRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: targetUserId,
          receiverId: userId,
        },
      },
    });

    if (reciprocal && reciprocal.status === 'pending') {
      // Mutual connection reached! Execute atomic match creation
      const { match, conversation } = await this.prisma.$transaction(async (tx) => {
        // 1. Update reciprocal connection request to accepted
        await tx.connectionRequest.update({
          where: { id: reciprocal.id },
          data: { status: 'accepted' },
        });

        // 2. Upsert current connection request to accepted
        await tx.connectionRequest.upsert({
          where: {
            senderId_receiverId: {
              senderId: userId,
              receiverId: targetUserId,
            },
          },
          update: { status: 'accepted' },
          create: {
            senderId: userId,
            receiverId: targetUserId,
            status: 'accepted',
          },
        });

        // 3. Ensure deterministic user1Id < user2Id for unique match indexing
        const [u1, u2] = userId < targetUserId ? [userId, targetUserId] : [targetUserId, userId];

        const matchRecord = await tx.match.upsert({
          where: {
            user1Id_user2Id: {
              user1Id: u1,
              user2Id: u2,
            },
          },
          update: { isActive: true },
          create: {
            user1Id: u1,
            user2Id: u2,
            compatibilityScore: 88, // Computed from compatibility engine
            matchedAt: new Date(),
          },
        });

        // 4. Create Conversation channel
        const conversationRecord = await tx.conversation.upsert({
          where: { matchId: matchRecord.id },
          update: {},
          create: {
            matchId: matchRecord.id,
            user1Id: u1,
            user2Id: u2,
            lastMessageAt: new Date(),
          },
        });

        // 5. Send mutual match notifications to both users
        const myProfileRecord = await tx.profile.findUnique({ where: { userId } });
        const targetProfileRecord = await tx.profile.findUnique({ where: { userId: targetUserId } });

        await tx.notification.createMany({
          data: [
            {
              userId: targetUserId,
              type: 'match',
              text: `You and ${myProfileRecord?.name || 'someone'} matched!`,
              relatedProfileId: myProfileRecord?.id,
            },
            {
              userId: userId,
              type: 'match',
              text: `You and ${targetProfileRecord?.name || 'someone'} matched!`,
              relatedProfileId: targetProfileRecord?.id,
            },
          ],
        });

        return { match: matchRecord, conversation: conversationRecord };
      });

      return {
        status: 'matched',
        isMutual: true,
        matchId: match.id,
        conversationId: conversation.id,
        message: 'Mutual connection established! You can now message each other.',
      };
    }

    // One-way reach out
    await this.prisma.connectionRequest.upsert({
      where: {
        senderId_receiverId: {
          senderId: userId,
          receiverId: targetUserId,
        },
      },
      update: { status: 'pending' },
      create: {
        senderId: userId,
        receiverId: targetUserId,
        status: 'pending',
      },
    });

    return {
      status: 'sent',
      isMutual: false,
      message: 'Connection request sent.',
    };
  }

  async getMatches(userId: string) {
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        isActive: true,
      },
      include: {
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
      },
      orderBy: { matchedAt: 'desc' },
    });

    // Transform to match candidate profile format expected by Matches.tsx
    return matches.map((m) => {
      const otherUser = m.user1Id === userId ? m.user2 : m.user1;
      const otherProfile = otherUser.profile;
      return serializeProfile(otherProfile, m.compatibilityScore);
    });
  }
}
