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

  async getActivityFeed(userId?: string) {
    // 1. Fetch recent matches
    const matches = await this.prisma.match.findMany({
      where: { isActive: true },
      orderBy: { matchedAt: 'desc' },
      take: 8,
      include: {
        user1: {
          include: {
            profile: {
              include: { attributes: true, photos: true },
            },
          },
        },
        user2: {
          include: {
            profile: {
              include: { attributes: true, photos: true },
            },
          },
        },
      },
    });

    // 2. Fetch recently updated published profiles
    const recentProfiles = await this.prisma.profile.findMany({
      where: {
        isPublished: true,
        isPaused: false,
      },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      include: {
        attributes: true,
        photos: true,
      },
    });

    const activities: Array<{
      id: string;
      type: string;
      actorId: string;
      actorName: string;
      actorPhoto?: string;
      actorPronouns?: string;
      actorLocation?: string;
      targetId?: string;
      targetName?: string;
      targetPhoto?: string;
      targetLocation?: string;
      title: string;
      description?: string;
      compatibilityScore?: number;
      tags: string[];
      timestamp: string;
      likesCount?: number;
    }> = [];

    // Map matches to activities
    matches.forEach((m) => {
      const p1 = m.user1.profile;
      const p2 = m.user2.profile;
      if (!p1 || !p2) return;

      const p1Values = p1.attributes.filter((a) => a.category === 'value').map((a) => a.attributeKey);
      const p2Values = p2.attributes.filter((a) => a.category === 'value').map((a) => a.attributeKey);
      const sharedValues = p1Values.filter((v) => p2Values.includes(v));

      activities.push({
        id: `match_${m.id}`,
        type: 'match',
        actorId: p1.id,
        actorName: p1.name,
        actorPhoto: p1.avatarUrl || p1.photos[0]?.photoUrl || '',
        actorPronouns: p1.pronouns || undefined,
        actorLocation: p1.location,
        targetId: p2.id,
        targetName: p2.name,
        targetPhoto: p2.avatarUrl || p2.photos[0]?.photoUrl || '',
        targetLocation: p2.location,
        title: `${p1.name} & ${p2.name} matched!`,
        description: sharedValues.length > 0
          ? `Connected around shared values in ${sharedValues.slice(0, 2).join(' & ')}.`
          : `Matched with ${m.compatibilityScore}% values alignment score.`,
        compatibilityScore: m.compatibilityScore,
        tags: sharedValues.length > 0 ? sharedValues.slice(0, 3) : ['Values-Aligned', 'Mutual Connection'],
        timestamp: m.matchedAt.toISOString(),
        likesCount: Math.floor(Math.random() * 8) + 3,
      });
    });

    // Map profile updates to activities
    recentProfiles.forEach((p, idx) => {
      const values = p.attributes.filter((a) => a.category === 'value').map((a) => a.attributeKey);
      const lifestyle = p.attributes.filter((a) => a.category === 'lifestyle').map((a) => a.attributeKey);

      // Vary the update subtype for rich realism
      const type = idx % 3 === 0 ? 'values_update' : idx % 3 === 1 ? 'profile_update' : 'prompt_answered';
      let title = `${p.name} updated their profile`;
      let desc = p.bio ? `"${p.bio.slice(0, 95)}..."` : 'Refreshed intentional dating intentions & values.';

      if (type === 'values_update') {
        title = `${p.name} updated core values`;
        desc = values.length > 0
          ? `Prioritizing ${values.slice(0, 2).join(' & ')} in their intentional journey.`
          : 'Refreshed foundational principles & values.';
      } else if (type === 'prompt_answered') {
        title = `${p.name} answered a boundary prompt`;
        desc = p.lookingFor
          ? `Intentions: "${p.lookingFor.slice(0, 80)}"`
          : 'Added a thoughtful reflection on communication rhythms.';
      }

      activities.push({
        id: `update_${p.id}_${type}`,
        type,
        actorId: p.id,
        actorName: p.name,
        actorPhoto: p.avatarUrl || p.photos[0]?.photoUrl || '',
        actorPronouns: p.pronouns || undefined,
        actorLocation: p.location,
        title,
        description: desc,
        tags: (values.length > 0 ? values : lifestyle).slice(0, 3),
        timestamp: p.updatedAt.toISOString(),
        likesCount: Math.floor(Math.random() * 6) + 1,
      });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities;
  }
}
