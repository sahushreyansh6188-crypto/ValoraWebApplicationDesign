import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();

async function main() {
  const email = 'dude.5796.3223@gmail.com';
  let user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
  const hash = await hashPassword('password123');

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        role: 'user',
        accountStatus: 'active',
        isVerified: true,
        termsAcceptedAt: new Date(),
        profile: {
          create: {
            name: 'Dude Valora',
            age: 26,
            location: 'San Francisco, CA',
            isPublished: true,
            bio: 'Values-first intentional dating.',
          },
        },
        settings: { create: {} },
        preferences: { create: {} },
        subscription: { create: { plan: 'free', status: 'active' } },
      },
      include: { profile: true },
    });
    console.log('Successfully created user in Prisma:', user.email, user.id);
  } else {
    // Update password hash so user can log in with password123 or any password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, accountStatus: 'active', isVerified: true },
    });
    console.log('Successfully updated user in Prisma:', user.email, user.id);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  });
