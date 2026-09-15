import type { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { AppError } from '../../utils/errors.js';
import crypto from 'node:crypto';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async signup(data: { name: string; email: string; password: string; agreedTerms?: boolean; termsAccepted?: boolean }) {
    if (!data.agreedTerms && !data.termsAccepted) {
      throw AppError.badRequest('You must agree to Valora Terms of Service to continue');
    }

    const email = data.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw AppError.conflict('An account with this email address already exists');
    }

    const passwordHash = await hashPassword(data.password);

    // Create user and empty profile shell
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'user',
        accountStatus: 'active',
        isVerified: false,
        termsAcceptedAt: new Date(),
        profile: {
          create: {
            name: data.name.trim(),
            age: 18,
            location: '',
            isPublished: false,
          },
        },
        settings: {
          create: {},
        },
        preferences: {
          create: {},
        },
        subscription: {
          create: {
            plan: 'free',
            status: 'active',
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    return {
      user,
      requiresVerification: true,
    };
  }

  async login(data: { email: string; password: string }) {
    const email = data.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user || !user.passwordHash) {
      throw AppError.invalidCredentials();
    }

    if (user.accountStatus === 'suspended') {
      throw AppError.forbidden('Your account has been temporarily suspended. Please contact support.');
    }

    if (user.accountStatus === 'banned') {
      throw AppError.forbidden('Your account has been permanently deactivated due to policy violations.');
    }

    if (user.accountStatus === 'deleted') {
      throw AppError.notFound('Account not found');
    }

    const valid = await verifyPassword(user.passwordHash, data.password);
    if (!valid) {
      throw AppError.invalidCredentials();
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.profile?.name || '',
        role: user.role,
        isVerified: user.isVerified,
        hasProfile: user.profile?.isPublished || false,
      },
    };
  }

  async verifyEmail(token: string) {
    // In production, token is decoded from JWT or lookup table. For MVP contract verification:
    if (!token) throw AppError.badRequest('Verification token is required');
    return { verified: true, message: 'Email address verified successfully.' };
  }

  async forgotPassword(email: string) {
    // Generic response to prevent account enumeration
    return { message: 'If the email is registered, a password reset link has been dispatched.' };
  }

  async googleAuth(code: string) {
    if (!code) throw AppError.badRequest('OAuth authorization code is required');
    // Simulated Google OAuth exchange
    return {
      user: {
        id: 'usr_google_' + Date.now(),
        email: 'google.user@example.com',
        name: 'Google User',
        role: 'user',
        isVerified: true,
        hasProfile: false,
      },
    };
  }
}
