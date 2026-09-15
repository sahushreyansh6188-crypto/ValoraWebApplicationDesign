import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting VALORA database seed...');

  const defaultPasswordHash = await hashPassword('Password123!');

  // 1. Create Current User (Alex)
  const alexUser = await prisma.user.upsert({
    where: { email: 'alex@example.com' },
    update: {},
    create: {
      email: 'alex@example.com',
      passwordHash: defaultPasswordHash,
      role: 'user',
      accountStatus: 'active',
      isVerified: true,
      termsAcceptedAt: new Date(),
      profile: {
        create: {
          name: 'Alex',
          age: 29,
          pronouns: 'they/them',
          location: 'Portland, OR',
          latitude: 45.5152,
          longitude: -122.6784,
          occupation: 'UX Designer',
          bio: 'I believe the small things matter most — morning routines, honest conversations, and leaving the world a little better. Looking for someone whose life I can genuinely complement, not complete.',
          lookingFor: 'A meaningful, long-term relationship',
          avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop&auto=format',
          isPublished: true,
          isPaused: false,
          photos: {
            create: [
              {
                photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=1000&fit=crop&auto=format',
                displayOrder: 0,
                isPrimary: true,
              },
            ],
          },
          attributes: {
            create: [
              { category: 'lifestyle', attributeKey: 'vegan' },
              { category: 'lifestyle', attributeKey: 'alcohol-free' },
              { category: 'lifestyle', attributeKey: 'mindfulness practice' },
              { category: 'lifestyle', attributeKey: 'zero-waste' },
              { category: 'value', attributeKey: 'authenticity' },
              { category: 'value', attributeKey: 'growth' },
              { category: 'value', attributeKey: 'compassion' },
              { category: 'value', attributeKey: 'creativity' },
              { category: 'communication', attributeKey: 'direct communicator' },
              { category: 'communication', attributeKey: 'needs processing time' },
              { category: 'boundary', attributeKey: 'slow-paced dating' },
              { category: 'boundary', attributeKey: 'no hookups' },
            ],
          },
        },
      },
      preferences: {
        create: {
          ageMin: 25,
          ageMax: 45,
          distanceMiles: 50,
          lifestyleFilters: ['alcohol-free', 'vegan', 'zero-waste'],
        },
      },
      settings: {
        create: {
          notifyMatches: true,
          notifyMessages: true,
          notifySystem: false,
          privacyShowLastActive: true,
          privacyShowLocation: true,
        },
      },
      subscription: {
        create: {
          plan: 'free',
          status: 'active',
        },
      },
    },
    include: { profile: true },
  });

  console.log(`✅ Seeded primary user: ${alexUser.email} (id: ${alexUser.id})`);

  // 2. Candidate Profiles from mock.ts
  const candidateSeeds = [
    {
      email: 'jordan@example.com',
      name: 'Jordan',
      age: 31,
      pronouns: 'she/her',
      location: 'Seattle, WA',
      lat: 47.6062,
      lon: -122.3321,
      occupation: 'Environmental Consultant',
      bio: "Deeply committed to living with less and meaning more. I spend my weekends at the farmers market or in the garden. I'm looking for someone who shares a vision of a sustainable, intentional life — and can handle the occasional impromptu road trip.",
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop&auto=format',
      lifestyle: ['vegan', 'zero-waste', 'outdoor lifestyle', 'mindfulness practice'],
      values: ['authenticity', 'growth', 'simplicity', 'justice'],
      comm: ['direct communicator', 'loves long conversations'],
      boundaries: ['slow-paced dating', 'monogamy only'],
      lookingFor: 'A partner for a sustainable life together',
      plan: 'connect',
    },
    {
      email: 'sam@example.com',
      name: 'Sam',
      age: 28,
      pronouns: 'they/them',
      location: 'Oakland, CA',
      lat: 37.8044,
      lon: -122.2712,
      occupation: 'Therapist',
      bio: "Neurodivergent and proudly so. I communicate with care and need people who do the same. Passionate about mental health, community, and really good tea. I take things slowly and intentionally — that's not a quirk, it's a feature.",
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&auto=format',
      lifestyle: ['alcohol-free', 'mindfulness practice', 'homebody', 'arts & creative'],
      values: ['authenticity', 'compassion', 'intellectual curiosity', 'community'],
      comm: ['needs processing time', 'text-first', 'quality time focused'],
      boundaries: ['slow-paced dating', 'privacy focused', 'no hookups'],
      lookingFor: 'Someone who communicates thoughtfully and shows up consistently',
      plan: 'free',
    },
    {
      email: 'river@example.com',
      name: 'River',
      age: 34,
      pronouns: 'he/him',
      location: 'Portland, OR',
      lat: 45.5152,
      lon: -122.6784,
      occupation: 'Permaculture Designer',
      bio: "Living proof that you can build your whole life around your values. I grow my own food, bike everywhere, and I'm slowly getting better at saying no to things that don't align with who I am. Looking for someone grounded who wants to build something real.",
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop&auto=format',
      lifestyle: ['vegan', 'zero-waste', 'outdoor lifestyle', 'sustainability focused'],
      values: ['simplicity', 'growth', 'independence', 'compassion'],
      comm: ['direct communicator', 'low phone time', 'quality time focused'],
      boundaries: ['slow-paced dating', 'no hookups', 'LGBTQ+ affirming'],
      lookingFor: 'A grounded partner who wants to build something real',
      plan: 'connect',
    },
    {
      email: 'maya@example.com',
      name: 'Maya',
      age: 26,
      pronouns: 'she/her',
      location: 'Denver, CO',
      lat: 39.7392,
      lon: -104.9903,
      occupation: 'Yoga Instructor & Wellness Coach',
      bio: 'I left a corporate career to live more slowly and purposefully. I believe the body knows things the mind ignores. Looking for connection that has room for growth, silence, and a lot of laughter.',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop&auto=format',
      lifestyle: ['plant-based', 'mindfulness practice', 'fitness focused', 'arts & creative'],
      values: ['authenticity', 'growth', 'spirituality', 'humor'],
      comm: ['direct communicator', 'loves long conversations', 'quality time focused'],
      boundaries: ['slow-paced dating', 'monogamy only'],
      lookingFor: 'Someone curious about the inner life',
      plan: 'annual',
    },
    {
      email: 'devon@example.com',
      name: 'Devon',
      age: 33,
      pronouns: 'he/him',
      location: 'Austin, TX',
      lat: 30.2672,
      lon: -97.7431,
      occupation: 'Software Engineer',
      bio: 'I spend my weeks solving problems and my weekends outside. I cook for fun, read voraciously, and have strong opinions about public transit. I\'m straightforward, curious, and looking for the same.',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop&auto=format',
      lifestyle: ['plant-based', 'alcohol-free', 'outdoor lifestyle', 'sustainability focused'],
      values: ['intellectual curiosity', 'growth', 'authenticity', 'loyalty'],
      comm: ['direct communicator', 'prefers calls', 'needs processing time'],
      boundaries: ['slow-paced dating', 'no hookups', 'LGBTQ+ affirming'],
      lookingFor: 'Someone I can build a real life with',
      plan: 'free',
    },
    {
      email: 'priya@example.com',
      name: 'Priya',
      age: 30,
      pronouns: 'she/her',
      location: 'San Francisco, CA',
      lat: 37.7749,
      lon: -122.4194,
      occupation: 'Researcher & Writer',
      bio: 'I\'m interested in how we live — what we consume, what we say, how we treat each other. Looking for someone who thinks deeply and still manages to be fun at dinner.',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop&auto=format',
      lifestyle: ['vegan', 'sustainability focused', 'arts & creative', 'travel frequently'],
      values: ['intellectual curiosity', 'justice', 'authenticity', 'creativity'],
      comm: ['text-first', 'loves long conversations', 'needs processing time'],
      boundaries: ['slow-paced dating', 'LGBTQ+ affirming', 'privacy focused'],
      lookingFor: 'A genuine intellectual and emotional companion',
      plan: 'free',
    },
  ];

  const createdCandidates = [];
  for (const c of candidateSeeds) {
    const candidate = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        passwordHash: defaultPasswordHash,
        role: 'user',
        accountStatus: 'active',
        isVerified: true,
        termsAcceptedAt: new Date(),
        profile: {
          create: {
            name: c.name,
            age: c.age,
            pronouns: c.pronouns,
            location: c.location,
            latitude: c.lat,
            longitude: c.lon,
            occupation: c.occupation,
            bio: c.bio,
            lookingFor: c.lookingFor,
            avatarUrl: c.avatar,
            isPublished: true,
            isPaused: false,
            photos: {
              create: [{ photoUrl: c.avatar, displayOrder: 0, isPrimary: true }],
            },
            attributes: {
              create: [
                ...c.lifestyle.map((l) => ({ category: 'lifestyle', attributeKey: l })),
                ...c.values.map((v) => ({ category: 'value', attributeKey: v })),
                ...c.comm.map((cm) => ({ category: 'communication', attributeKey: cm })),
                ...c.boundaries.map((b) => ({ category: 'boundary', attributeKey: b })),
              ],
            },
          },
        },
        subscription: {
          create: {
            plan: c.plan,
            status: 'active',
          },
        },
      },
      include: { profile: true },
    });
    createdCandidates.push(candidate);
    console.log(`✅ Seeded candidate: ${c.name} (${c.email})`);
  }

  // 3. Seed Mutual Matches (Jordan, Sam, River)
  const matchUsers = [createdCandidates[0], createdCandidates[1], createdCandidates[2]];
  const matchScores = [92, 87, 84];

  for (let i = 0; i < matchUsers.length; i++) {
    const target = matchUsers[i];
    const match = await prisma.match.upsert({
      where: {
        user1Id_user2Id: {
          user1Id: alexUser.id,
          user2Id: target.id,
        },
      },
      update: {},
      create: {
        user1Id: alexUser.id,
        user2Id: target.id,
        compatibilityScore: matchScores[i],
        matchedAt: new Date(Date.now() - (i + 2) * 86400000),
      },
    });

    // Seed Conversation
    const conversation = await prisma.conversation.upsert({
      where: { matchId: match.id },
      update: {},
      create: {
        matchId: match.id,
        user1Id: alexUser.id,
        user2Id: target.id,
        lastMessageAt: new Date(),
      },
    });

    // Seed Messages
    if (i === 0) {
      // Conversation with Jordan
      await prisma.message.createMany({
        data: [
          {
            conversationId: conversation.id,
            senderId: target.id,
            text: "I saw you're also zero-waste! Do you have a go-to for plastic-free personal care?",
            read: true,
            createdAt: new Date(Date.now() - 5000000),
          },
          {
            conversationId: conversation.id,
            senderId: alexUser.id,
            text: "Yes! I've been using solid shampoo bars from a local maker and it's been life-changing honestly.",
            read: true,
            createdAt: new Date(Date.now() - 4000000),
          },
          {
            conversationId: conversation.id,
            senderId: target.id,
            text: "I need that recommendation. Also — love your bio. 'The small things matter most.' That's exactly how I think about it.",
            read: true,
            createdAt: new Date(Date.now() - 3000000),
          },
          {
            conversationId: conversation.id,
            senderId: alexUser.id,
            text: "Thank you, that means a lot. It's hard to summarize yourself without it sounding like a resume.",
            read: true,
            createdAt: new Date(Date.now() - 2000000),
          },
          {
            conversationId: conversation.id,
            senderId: target.id,
            text: "Would you want to continue this over coffee sometime? I know a great place in Portland.",
            read: true,
            createdAt: new Date(Date.now() - 1000000),
          },
        ],
      });
    } else if (i === 1) {
      // Conversation with Sam (unread)
      await prisma.message.createMany({
        data: [
          {
            conversationId: conversation.id,
            senderId: target.id,
            text: "Hi Alex — we matched! I love your value around processing time. I often need that too.",
            read: false,
            createdAt: new Date(Date.now() - 600000),
          },
          {
            conversationId: conversation.id,
            senderId: target.id,
            text: "No rush to respond — just wanted to say hello when I was ready.",
            read: false,
            createdAt: new Date(Date.now() - 500000),
          },
        ],
      });
    } else if (i === 2) {
      // Conversation with River
      await prisma.message.createMany({
        data: [
          {
            conversationId: conversation.id,
            senderId: alexUser.id,
            text: "A permaculture designer — I have so many questions. Do you work mostly on residential projects?",
            read: true,
            createdAt: new Date(Date.now() - 12000000),
          },
          {
            conversationId: conversation.id,
            senderId: target.id,
            text: "Mostly residential but I've done some community garden projects too. What draws you to it?",
            read: true,
            createdAt: new Date(Date.now() - 11000000),
          },
        ],
      });
    }
  }
  console.log('✅ Seeded mutual matches, conversations, and messages.');

  // 4. Seed Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: alexUser.id,
        type: 'match',
        text: 'You and Jordan matched!',
        read: false,
        relatedProfileId: createdCandidates[0].profile?.id,
        createdAt: new Date(Date.now() - 172800000),
      },
      {
        userId: alexUser.id,
        type: 'message',
        text: 'Sam sent you a message',
        read: false,
        relatedProfileId: createdCandidates[1].profile?.id,
        createdAt: new Date(Date.now() - 86400000),
      },
      {
        userId: alexUser.id,
        type: 'match',
        text: 'You and River matched!',
        read: true,
        relatedProfileId: createdCandidates[2].profile?.id,
        createdAt: new Date(Date.now() - 432000000),
      },
      {
        userId: alexUser.id,
        type: 'system',
        text: 'Your profile is performing well. Consider adding a second photo to increase visibility.',
        read: true,
        createdAt: new Date(Date.now() - 604800000),
      },
    ],
  });
  console.log('✅ Seeded activity notifications.');

  // 5. Seed Admin & Moderator Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@valora.com' },
    update: {},
    create: {
      email: 'admin@valora.com',
      passwordHash: defaultPasswordHash,
      role: 'admin',
      accountStatus: 'active',
      isVerified: true,
      profile: {
        create: {
          name: 'Platform Admin',
          age: 35,
          location: 'San Francisco, CA',
          isPublished: false,
        },
      },
    },
  });

  const moderatorUser = await prisma.user.upsert({
    where: { email: 'moderator@valora.com' },
    update: {},
    create: {
      email: 'moderator@valora.com',
      passwordHash: defaultPasswordHash,
      role: 'moderator',
      accountStatus: 'active',
      isVerified: true,
      profile: {
        create: {
          name: 'Moderator Aria',
          age: 28,
          location: 'Austin, TX',
          isPublished: false,
        },
      },
    },
  });

  // Seed Admin Reports
  await prisma.report.createMany({
    data: [
      {
        reporterId: createdCandidates[1].id,
        reportedId: createdCandidates[4].id,
        reason: 'Inappropriate messages',
        severity: 'high',
        status: 'open',
        createdAt: new Date(Date.now() - 7200000),
      },
      {
        reporterId: createdCandidates[3].id,
        reportedId: createdCandidates[2].id,
        reason: 'Misleading profile information',
        severity: 'medium',
        status: 'open',
        createdAt: new Date(Date.now() - 18000000),
      },
      {
        reporterId: createdCandidates[0].id,
        reportedId: createdCandidates[5].id,
        reason: 'Harassment',
        severity: 'high',
        status: 'under review',
        assignedModeratorId: moderatorUser.id,
        createdAt: new Date(Date.now() - 86400000),
      },
      {
        reporterId: createdCandidates[4].id,
        reportedId: createdCandidates[1].id,
        reason: 'Spam / solicitation',
        severity: 'low',
        status: 'resolved',
        assignedModeratorId: moderatorUser.id,
        resolvedAt: new Date(Date.now() - 43200000),
        resolutionNotes: 'No policy violation found.',
        createdAt: new Date(Date.now() - 172800000),
      },
    ],
  });

  // Seed Admin Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: adminUser.id,
        actorName: 'Admin (system)',
        action: 'User suspended',
        targetEntity: 'User',
        targetId: createdCandidates[2].id,
        createdAt: new Date(Date.now() - 360000000),
      },
      {
        actorId: moderatorUser.id,
        actorName: 'Moderator Aria',
        action: 'Report resolved',
        targetEntity: 'Report',
        targetId: 'r004',
        createdAt: new Date(Date.now() - 86400000),
      },
      {
        actorId: adminUser.id,
        actorName: 'System',
        action: 'Account verified',
        targetEntity: 'User',
        targetId: createdCandidates[5].id,
        createdAt: new Date(Date.now() - 43200000),
      },
      {
        actorId: moderatorUser.id,
        actorName: 'Moderator Ben',
        action: 'Profile removed',
        targetEntity: 'Profile',
        targetId: 'u555',
        createdAt: new Date(Date.now() - 259200000),
      },
      {
        actorId: adminUser.id,
        actorName: 'System',
        action: 'Subscription upgraded',
        targetEntity: 'Subscription',
        targetId: createdCandidates[3].id,
        createdAt: new Date(Date.now() - 604800000),
      },
    ],
  });

  console.log('✅ Seeded admin users, reports, and audit logs.');
  console.log('🎉 VALORA database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
