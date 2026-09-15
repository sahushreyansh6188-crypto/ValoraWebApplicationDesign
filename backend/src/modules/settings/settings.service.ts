import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../utils/errors.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';

export class SettingsService {
  constructor(private prisma: PrismaClient) {}

  async getSettings(userId: string) {
    const [settings, profile] = await Promise.all([
      this.prisma.userSetting.findUnique({ where: { userId } }),
      this.prisma.profile.findUnique({ where: { userId } }),
    ]);

    const notifyMatches = settings?.notifyMatches ?? true;
    const notifyMessages = settings?.notifyMessages ?? true;
    const notifySystem = settings?.notifySystem ?? false;
    const showLastActive = settings?.privacyShowLastActive ?? true;
    const showLocation = settings?.privacyShowLocation ?? true;
    const isPaused = profile ? profile.isPaused : false;

    return {
      notifications: {
        matches: notifyMatches,
        messages: notifyMessages,
        system: notifySystem,
        emailMatches: notifyMatches,
        emailMessages: notifyMessages,
        emailSystem: notifySystem,
      },
      privacy: {
        showLastActive,
        showLocation,
        showApproxLocation: showLocation,
      },
      visibility: !isPaused,
      isPaused,
    };
  }

  async updateSettings(
    userId: string,
    data: {
      notifications?: {
        matches?: boolean;
        messages?: boolean;
        system?: boolean;
        emailMatches?: boolean;
        emailMessages?: boolean;
        emailSystem?: boolean;
      };
      privacy?: {
        showLastActive?: boolean;
        showLocation?: boolean;
        showApproxLocation?: boolean;
      };
      visibility?: boolean;
      isPaused?: boolean;
    }
  ) {
    const notifyMatches = data.notifications?.matches ?? data.notifications?.emailMatches;
    const notifyMessages = data.notifications?.messages ?? data.notifications?.emailMessages;
    const notifySystem = data.notifications?.system ?? data.notifications?.emailSystem;
    const showLastActive = data.privacy?.showLastActive;
    const showLocation = data.privacy?.showLocation ?? data.privacy?.showApproxLocation;
    let visibility = data.visibility;
    if (data.isPaused !== undefined && visibility === undefined) {
      visibility = !data.isPaused;
    }

    await this.prisma.$transaction(async (tx) => {
      if (
        notifyMatches !== undefined ||
        notifyMessages !== undefined ||
        notifySystem !== undefined ||
        showLastActive !== undefined ||
        showLocation !== undefined
      ) {
        await tx.userSetting.upsert({
          where: { userId },
          update: {
            ...(notifyMatches !== undefined && { notifyMatches }),
            ...(notifyMessages !== undefined && { notifyMessages }),
            ...(notifySystem !== undefined && { notifySystem }),
            ...(showLastActive !== undefined && { privacyShowLastActive: showLastActive }),
            ...(showLocation !== undefined && { privacyShowLocation: showLocation }),
          },
          create: {
            userId,
            notifyMatches: notifyMatches ?? true,
            notifyMessages: notifyMessages ?? true,
            notifySystem: notifySystem ?? false,
            privacyShowLastActive: showLastActive ?? true,
            privacyShowLocation: showLocation ?? true,
          },
        });
      }

      if (visibility !== undefined) {
        await tx.profile.update({
          where: { userId },
          data: { isPaused: !visibility },
        });
      }
    });

    return this.getSettings(userId);
  }

  async getPreferences(userId: string) {
    const prefs = await this.prisma.userPreference.findUnique({ where: { userId } });
    return {
      ageMin: prefs?.ageMin ?? 25,
      ageMax: prefs?.ageMax ?? 45,
      distanceMiles: prefs?.distanceMiles ?? 50,
      lifestyleFilters: prefs?.lifestyleFilters ?? [],
    };
  }

  async updatePreferences(
    userId: string,
    data: { ageMin?: number; ageMax?: number; distanceMiles?: number; lifestyleFilters?: string[] }
  ) {
    const updated = await this.prisma.userPreference.upsert({
      where: { userId },
      update: {
        ...(data.ageMin !== undefined && { ageMin: data.ageMin }),
        ...(data.ageMax !== undefined && { ageMax: data.ageMax }),
        ...(data.distanceMiles !== undefined && { distanceMiles: data.distanceMiles }),
        ...(data.lifestyleFilters !== undefined && { lifestyleFilters: data.lifestyleFilters }),
      },
      create: {
        userId,
        ageMin: data.ageMin ?? 25,
        ageMax: data.ageMax ?? 45,
        distanceMiles: data.distanceMiles ?? 50,
        lifestyleFilters: data.lifestyleFilters ?? [],
      },
    });

    return updated;
  }

  async updateEmail(userId: string, newEmail: string) {
    const normalized = newEmail.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing && existing.id !== userId) {
      throw AppError.conflict('This email address is already in use');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { email: normalized },
    });

    return { email: normalized };
  }

  async updatePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw AppError.badRequest('Cannot change password for this account');
    }

    const isValid = await verifyPassword(user.passwordHash, currentPass);
    if (!isValid) {
      throw AppError.invalidCredentials();
    }

    if (newPass.length < 8) {
      throw AppError.badRequest('New password must be at least 8 characters');
    }

    const newHash = await hashPassword(newPass);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true };
  }

  async deleteAccount(userId: string, confirmation: string) {
    if (confirmation.toLowerCase().trim() !== 'delete') {
      throw AppError.badRequest('Type "delete" to confirm account deletion');
    }

    // Atomic soft-delete to preserve audit logs & sever matches
    await this.prisma.$transaction(async (tx) => {
      // 1. Hide profile
      await tx.profile.update({
        where: { userId },
        data: {
          isPublished: false,
          isPaused: true,
        },
      });

      // 2. Mark account deleted
      await tx.user.update({
        where: { id: userId },
        data: {
          accountStatus: 'deleted',
          email: `deleted_${Date.now()}_${userId}@valora.deleted`,
          passwordHash: null,
        },
      });

      // 3. Deactivate matches
      await tx.match.updateMany({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
        data: { isActive: false },
      });
    });

    return { deleted: true };
  }
}
