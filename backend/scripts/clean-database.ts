import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/valora?schema=public',
    },
  },
});

async function clean() {
  console.log('🧹 Purging all dummy profiles, messages, matches, reports, and mock data from database...');

  // Delete dependent rows first to satisfy relational integrity constraints
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.connectionRequest.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.block.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.profilePhoto.deleteMany({});
  await prisma.profileAttribute.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.userPreference.deleteMany({});
  await prisma.userSetting.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✨ All dummy data, users, and profiles purged! Database is completely clean.');
}

clean()
  .catch((err) => {
    console.error('Error cleaning database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
