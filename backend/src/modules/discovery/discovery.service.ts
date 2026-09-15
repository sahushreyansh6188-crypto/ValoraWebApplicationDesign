import type { PrismaClient } from '@prisma/client';
import { calculateCompatibilityScore } from '../../config/scoring.js';
import { serializeProfile } from '../../serialization/profileSerializer.js';
import { calculateDistanceMiles } from '../../utils/geo.js';

export class DiscoveryService {
  constructor(private prisma: PrismaClient) {}

  async getDiscoveryFeed(
    userId: string,
    query: {
      lifestyle?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    // 1. Fetch current user with attributes and preferences
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: { attributes: true },
        },
        preferences: true,
      },
    });

    if (!currentUser || !currentUser.profile) {
      return { items: [], total: 0 };
    }

    const myProfile = currentUser.profile;
    const myPrefs = currentUser.preferences;

    // Extract current user attributes
    const myValues = myProfile.attributes
      .filter((a) => a.category === 'value')
      .map((a) => a.attributeKey);
    const myLifestyle = myProfile.attributes
      .filter((a) => a.category === 'lifestyle')
      .map((a) => a.attributeKey);
    const myComm = myProfile.attributes
      .filter((a) => a.category === 'communication')
      .map((a) => a.attributeKey);
    const myBoundaries = myProfile.attributes
      .filter((a) => a.category === 'boundary')
      .map((a) => a.attributeKey);

    // 2. Query blocked users
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    const blockedIds = new Set(
      blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId))
    );

    // 3. Query passed profiles
    const passedRequests = await this.prisma.connectionRequest.findMany({
      where: {
        senderId: userId,
        status: 'passed',
      },
    });
    const passedIds = new Set(passedRequests.map((p) => p.receiverId));

    // Excluded IDs
    const excludedIds = [userId, ...Array.from(blockedIds), ...Array.from(passedIds)];

    // 4. Fetch published candidate profiles
    const candidates = await this.prisma.profile.findMany({
      where: {
        userId: { notIn: excludedIds },
        isPublished: true,
        isPaused: false,
        user: {
          accountStatus: 'active',
        },
        ...(myPrefs && {
          age: {
            gte: myPrefs.ageMin,
            lte: myPrefs.ageMax,
          },
        }),
      },
      include: {
        photos: { orderBy: { displayOrder: 'asc' } },
        attributes: true,
      },
    });

    // 5. Score and filter candidates
    const scoredCandidates = [];

    for (const candidate of candidates) {
      const cValues = candidate.attributes
        .filter((a) => a.category === 'value')
        .map((a) => a.attributeKey);
      const cLifestyle = candidate.attributes
        .filter((a) => a.category === 'lifestyle')
        .map((a) => a.attributeKey);
      const cComm = candidate.attributes
        .filter((a) => a.category === 'communication')
        .map((a) => a.attributeKey);
      const cBoundaries = candidate.attributes
        .filter((a) => a.category === 'boundary')
        .map((a) => a.attributeKey);

      // Filter by requested lifestyle tag if specified and not "All"
      if (
        query.lifestyle &&
        query.lifestyle.toLowerCase() !== 'all' &&
        !cLifestyle.some((l) => l.toLowerCase().includes(query.lifestyle!.toLowerCase()))
      ) {
        continue;
      }

      // Check distance filter if coordinates are available
      if (
        myPrefs &&
        myProfile.latitude &&
        myProfile.longitude &&
        candidate.latitude &&
        candidate.longitude
      ) {
        const dist = calculateDistanceMiles(
          myProfile.latitude,
          myProfile.longitude,
          candidate.latitude,
          candidate.longitude
        );
        if (dist > myPrefs.distanceMiles) {
          continue;
        }
      }

      const { score } = calculateCompatibilityScore(
        { values: myValues, lifestyle: myLifestyle, communicationStyle: myComm, boundaries: myBoundaries },
        { values: cValues, lifestyle: cLifestyle, communicationStyle: cComm, boundaries: cBoundaries }
      );

      scoredCandidates.push({
        candidate,
        score,
      });
    }

    // Sort by compatibility score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Paginate
    const startIndex = (page - 1) * limit;
    const paginated = scoredCandidates.slice(startIndex, startIndex + limit);

    const items = paginated.map(({ candidate, score }) =>
      serializeProfile(candidate, score)
    );

    return {
      items,
      total: scoredCandidates.length,
    };
  }

  async passProfile(userId: string, targetProfileId: string) {
    // Resolve user ID if a profile ID was supplied
    let targetUserId = targetProfileId;
    const targetProfile = await this.prisma.profile.findFirst({
      where: {
        OR: [{ id: targetProfileId }, { userId: targetProfileId }],
      },
    });
    if (targetProfile) targetUserId = targetProfile.userId;

    await this.prisma.connectionRequest.upsert({
      where: {
        senderId_receiverId: {
          senderId: userId,
          receiverId: targetUserId,
        },
      },
      update: { status: 'passed' },
      create: {
        senderId: userId,
        receiverId: targetUserId,
        status: 'passed',
      },
    });

    return { passed: true };
  }
}
