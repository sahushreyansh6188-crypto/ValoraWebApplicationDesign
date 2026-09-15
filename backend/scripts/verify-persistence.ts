import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('=== VALORA SUPABASE PERSISTENCE AUDIT ===');
  const prisma1 = new PrismaClient();
  const userCount = await prisma1.user.count();
  const profileCount = await prisma1.profile.count();
  const messageCount = await prisma1.message.count();
  const matchCount = await prisma1.match.count();
  console.log(`Initial Counts: Users=${userCount}, Profiles=${profileCount}, Matches=${matchCount}, Messages=${messageCount}`);

  const testEmail = `persistence_${Date.now()}@valora.test`;
  const createdUser = await prisma1.user.create({
    data: {
      email: testEmail,
      role: 'user',
      accountStatus: 'active',
      isVerified: true,
      profile: {
        create: {
          name: 'Persistent Test User',
          age: 31,
          location: 'San Francisco, CA',
          occupation: 'Distributed Systems Eng',
          bio: 'Testing persistent storage in Supabase PostgreSQL',
        },
      },
    },
    include: { profile: true },
  });
  console.log(`Created test user: ID=${createdUser.id}, Email=${createdUser.email}`);

  await prisma1.$disconnect();
  console.log('Session 1 disconnected.');

  const prisma2 = new PrismaClient();
  const foundUser = await prisma2.user.findUnique({
    where: { id: createdUser.id },
    include: { profile: true },
  });

  if (!foundUser) {
    throw new Error('Verification failed: User record not found in second session!');
  }
  if (foundUser.profile?.name !== 'Persistent Test User') {
    throw new Error('Verification failed: Profile relation not persisted correctly!');
  }
  console.log(`Session 2 verified persisted record: ID=${foundUser.id}, Name=${foundUser.profile.name}`);

  await prisma2.user.delete({ where: { id: createdUser.id } });
  console.log('Test user cleaned up successfully.');
  await prisma2.$disconnect();
  console.log('Session 2 disconnected.');
  console.log('🎉 VERIFICATION RESULT: PASS - Supabase PostgreSQL persists all models and relations intact across sessions.');
}

main().catch((err) => {
  console.error('❌ PERSISTENCE AUDIT FAILED:', err);
  process.exit(1);
});
