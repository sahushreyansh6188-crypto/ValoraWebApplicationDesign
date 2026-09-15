import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../utils/errors.js';

export class SafetyService {
  constructor(private prisma: PrismaClient) {}

  async blockUser(blockerId: string, targetIdentifier: string) {
    let blockedId = targetIdentifier;
    // Resolve user ID if targetIdentifier was name or profileId
    const targetProfile = await this.prisma.profile.findFirst({
      where: {
        OR: [
          { id: targetIdentifier },
          { userId: targetIdentifier },
          { name: { equals: targetIdentifier, mode: 'insensitive' } },
        ],
      },
    });

    if (targetProfile) {
      blockedId = targetProfile.userId;
    }

    if (blockerId === blockedId) {
      throw AppError.badRequest('You cannot block yourself');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Create Block record
      await tx.block.upsert({
        where: {
          blockerId_blockedId: { blockerId, blockedId },
        },
        update: {},
        create: { blockerId, blockedId },
      });

      // 2. Deactivate any existing matches between them
      await tx.match.updateMany({
        where: {
          OR: [
            { user1Id: blockerId, user2Id: blockedId },
            { user1Id: blockedId, user2Id: blockerId },
          ],
        },
        data: { isActive: false },
      });
    });

    return { blocked: true, message: 'Member has been blocked.' };
  }

  async getBlockedUsers(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          include: { profile: true },
        },
      },
    });

    return blocks.map((b) => ({
      id: b.id,
      blockedUserId: b.blockedId,
      name: b.blocked.profile?.name || 'Unknown',
      blockedAt: b.createdAt,
    }));
  }

  async unblockUser(userId: string, targetIdentifier: string) {
    let block = await this.prisma.block.findFirst({
      where: {
        blockerId: userId,
        OR: [{ id: targetIdentifier }, { blockedId: targetIdentifier }],
      },
    });

    if (!block) {
      const profile = await this.prisma.profile.findFirst({
        where: {
          OR: [
            { id: targetIdentifier },
            { name: { equals: targetIdentifier, mode: 'insensitive' } },
          ],
        },
      });
      if (profile) {
        block = await this.prisma.block.findFirst({
          where: { blockerId: userId, blockedId: profile.userId },
        });
      }
    }

    if (!block) {
      throw AppError.notFound('Block record not found');
    }

    await this.prisma.block.delete({ where: { id: block.id } });
    return { unblocked: true };
  }

  async submitReport(
    reporterId: string,
    data: { reportedIdentifier: string; reason: string; description?: string }
  ) {
    let reportedId = data.reportedIdentifier;
    const targetProfile = await this.prisma.profile.findFirst({
      where: {
        OR: [
          { id: data.reportedIdentifier },
          { userId: data.reportedIdentifier },
          { name: { equals: data.reportedIdentifier, mode: 'insensitive' } },
        ],
      },
    });

    if (targetProfile) reportedId = targetProfile.userId;

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedId,
        reason: data.reason,
        description: data.description || '',
        severity: 'medium',
        status: 'open',
      },
    });

    return {
      ticketId: report.id,
      message: 'Report received and will be reviewed within 24 hours.',
    };
  }

  async unmatch(userId: string, targetIdentifier: string) {
    let targetUserId = targetIdentifier;
    const targetProfile = await this.prisma.profile.findFirst({
      where: {
        OR: [
          { id: targetIdentifier },
          { userId: targetIdentifier },
          { name: { equals: targetIdentifier, mode: 'insensitive' } },
        ],
      },
    });
    if (targetProfile) targetUserId = targetProfile.userId;

    await this.prisma.match.updateMany({
      where: {
        OR: [
          { user1Id: userId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: userId },
          { id: targetIdentifier },
        ],
      },
      data: { isActive: false },
    });

    return { unmatched: true };
  }
}
