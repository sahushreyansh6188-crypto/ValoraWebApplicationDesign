import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../utils/errors.js';
import { serializeProfile } from '../../serialization/profileSerializer.js';
import { resolveCoordinates } from '../../utils/geo.js';
import { storageService } from '../storage/storage.service.js';

export class ProfilesService {
  constructor(private prisma: PrismaClient) {}

  async getMyProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        photos: { orderBy: { displayOrder: 'asc' } },
        attributes: true,
      },
    });

    if (!profile) {
      throw AppError.notFound('Profile not found');
    }

    return serializeProfile(profile, 100);
  }

  async updateMyProfile(userId: string, data: { bio?: string; occupation?: string }) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw AppError.notFound('Profile not found');

    if (data.bio && data.bio.length > 400) {
      throw AppError.badRequest('Bio must not exceed 400 characters');
    }

    const updated = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.occupation !== undefined && { occupation: data.occupation }),
      },
      include: {
        photos: { orderBy: { displayOrder: 'asc' } },
        attributes: true,
      },
    });

    return serializeProfile(updated, 100);
  }

  async submitOnboarding(
    userId: string,
    data: {
      confirmedAge18?: boolean;
      name: string;
      age: number;
      pronouns?: string;
      location: string;
      occupation?: string;
      bio?: string;
      lifestyle: string[];
      values: string[];
      communicationStyle: string[];
      boundaries: string[];
      photo?: string;
      photos?: string[];
      lookingFor?: string;
      ageMin?: number;
      ageMax?: number;
      distanceMax?: number;
      preferences?: {
        ageMin?: number;
        ageMax?: number;
        distanceMiles?: number;
      };
    }
  ) {
    if (data.confirmedAge18 === false || data.age < 18 || data.age > 120) {
      throw AppError.badRequest('You must confirm you are 18 or older to complete onboarding');
    }
    if (data.values.length < 3 || data.values.length > 8) {
      throw AppError.badRequest('Please select between 3 and 8 core values');
    }
    if (data.lifestyle.length < 1) {
      throw AppError.badRequest('Please select at least one lifestyle choice');
    }
    if (data.communicationStyle.length < 1) {
      throw AppError.badRequest('Please select at least one communication preference');
    }
    if (data.boundaries.length < 1) {
      throw AppError.badRequest('Please select at least one boundary');
    }

    const coords = resolveCoordinates(data.location);

    // Execute atomic publish transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update user verification & status
      await tx.user.update({
        where: { id: userId },
        data: {
          isVerified: true,
          accountStatus: 'active',
        },
      });

      // 2. Upsert profile
      const profile = await tx.profile.upsert({
        where: { userId },
        update: {
          name: data.name.trim(),
          age: data.age,
          pronouns: data.pronouns || '',
          location: data.location.trim(),
          latitude: coords.lat,
          longitude: coords.lon,
          occupation: data.occupation?.trim() || '',
          bio: data.bio?.trim() || '',
          isPublished: true,
          isPaused: false,
        },
        create: {
          userId,
          name: data.name.trim(),
          age: data.age,
          pronouns: data.pronouns || '',
          location: data.location.trim(),
          latitude: coords.lat,
          longitude: coords.lon,
          occupation: data.occupation?.trim() || '',
          bio: data.bio?.trim() || '',
          isPublished: true,
          isPaused: false,
        },
      });

      // 3. Replace attributes
      await tx.profileAttribute.deleteMany({ where: { profileId: profile.id } });

      const attributesData = [
        ...data.lifestyle.map((l) => ({ profileId: profile.id, category: 'lifestyle', attributeKey: l })),
        ...data.values.map((v) => ({ profileId: profile.id, category: 'value', attributeKey: v })),
        ...data.communicationStyle.map((c) => ({ profileId: profile.id, category: 'communication', attributeKey: c })),
        ...data.boundaries.map((b) => ({ profileId: profile.id, category: 'boundary', attributeKey: b })),
      ];

      await tx.profileAttribute.createMany({ data: attributesData });

      // 4. Upsert preferences
      const ageMin = data.preferences?.ageMin ?? data.ageMin ?? 25;
      const ageMax = data.preferences?.ageMax ?? data.ageMax ?? 45;
      const distanceMiles = data.preferences?.distanceMiles ?? data.distanceMax ?? 50;

      await tx.userPreference.upsert({
        where: { userId },
        update: {
          ageMin,
          ageMax,
          distanceMiles,
        },
        create: {
          userId,
          ageMin,
          ageMax,
          distanceMiles,
        },
      });

      // 5. Save photos if provided
      const rawPhotos = [
        ...(data.photos || []),
        ...(data.photo ? [data.photo] : []),
      ];
      if (rawPhotos.length > 0) {
        await tx.profilePhoto.deleteMany({ where: { profileId: profile.id } });
        const uniquePhotos = Array.from(new Set(rawPhotos));
        await tx.profilePhoto.createMany({
          data: uniquePhotos.map((url, idx) => ({
            profileId: profile.id,
            photoUrl: url,
            isPrimary: idx === 0,
            displayOrder: idx,
          })),
        });
      }

      return profile;
    });

    return this.getMyProfile(userId);
  }

  async getPublicProfile(targetUserId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: targetUserId },
      include: {
        photos: { orderBy: { displayOrder: 'asc' } },
        attributes: true,
      },
    });

    if (!profile || !profile.isPublished || profile.isPaused) {
      throw AppError.notFound('Profile not available or hidden');
    }

    return serializeProfile(profile);
  }

  async requestPhotoUpload(userId: string, fileName: string, fileType: string) {
    return storageService.generatePresignedUpload(userId, fileType, fileName);
  }

  async addProfilePhoto(userId: string, photoUrl: string, isPrimary = false) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw AppError.notFound('Profile not found');

    const photo = await this.prisma.profilePhoto.create({
      data: {
        profileId: profile.id,
        photoUrl,
        isPrimary,
      },
    });

    if (isPrimary || !profile.avatarUrl) {
      await this.prisma.profile.update({
        where: { id: profile.id },
        data: { avatarUrl: photoUrl },
      });
    }

    return photo;
  }

  async deleteProfilePhoto(userId: string, photoId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw AppError.notFound('Profile not found');

    await this.prisma.profilePhoto.delete({
      where: { id: photoId, profileId: profile.id },
    });

    return { deleted: true };
  }
}
