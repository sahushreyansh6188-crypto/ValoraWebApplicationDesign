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

  async updateMyProfile(
    userId: string,
    data: {
      name?: string;
      email?: string;
      bio?: string;
      occupation?: string;
      pronouns?: string;
      location?: string;
      age?: number;
      lookingFor?: string;
      photo?: string;
      photos?: string[];
      lifestyle?: string[];
      values?: string[];
      communicationStyle?: string[];
      boundaries?: string[];
      isPaused?: boolean;
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
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { attributes: true, photos: true },
    });
    if (!profile) throw AppError.notFound('Profile not found');

    // Immutable fields enforcement
    if (data.name !== undefined && data.name.trim() !== profile.name) {
      throw AppError.badRequest('Name is an immutable account identifier and cannot be changed after registration.');
    }
    if (data.email !== undefined) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && data.email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
        throw AppError.badRequest('Email address is an immutable account identifier and cannot be changed after registration.');
      }
    }

    if (data.bio !== undefined && data.bio.length > 400) {
      throw AppError.badRequest('Bio must not exceed 400 characters');
    }
    if (data.occupation !== undefined && data.occupation.length > 150) {
      throw AppError.badRequest('Occupation must not exceed 150 characters');
    }
    if (data.age !== undefined && (data.age < 18 || data.age > 120)) {
      throw AppError.badRequest('Age must be between 18 and 120');
    }

    const coords = data.location ? resolveCoordinates(data.location) : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Update basic profile fields
      const updatedProfile = await tx.profile.update({
        where: { userId },
        data: {
          ...(data.bio !== undefined && { bio: data.bio.trim() }),
          ...(data.occupation !== undefined && { occupation: data.occupation.trim() }),
          ...(data.pronouns !== undefined && { pronouns: data.pronouns.trim() }),
          ...(data.location !== undefined && {
            location: data.location.trim(),
            latitude: coords?.lat ?? profile.latitude,
            longitude: coords?.lon ?? profile.longitude,
          }),
          ...(data.age !== undefined && { age: data.age }),
          ...(data.lookingFor !== undefined && { lookingFor: data.lookingFor.trim() }),
          ...(data.photo !== undefined && { avatarUrl: data.photo }),
          ...(data.isPaused !== undefined && { isPaused: data.isPaused }),
        },
        include: {
          photos: { orderBy: { displayOrder: 'asc' } },
          attributes: true,
        },
      });

      // 2. Photos update if provided
      const rawPhotos = [
        ...(data.photos || []),
        ...(data.photo && (!data.photos || !data.photos.includes(data.photo)) ? [data.photo] : []),
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
        await tx.profile.update({
          where: { id: profile.id },
          data: { avatarUrl: uniquePhotos[0] },
        });
      }

      // 3. Attributes update if provided
      if (data.lifestyle !== undefined) {
        await tx.profileAttribute.deleteMany({
          where: { profileId: profile.id, category: 'lifestyle' },
        });
        if (data.lifestyle.length > 0) {
          await tx.profileAttribute.createMany({
            data: data.lifestyle.map((l) => ({
              profileId: profile.id,
              category: 'lifestyle',
              attributeKey: l,
            })),
          });
        }
      }

      if (data.values !== undefined) {
        await tx.profileAttribute.deleteMany({
          where: { profileId: profile.id, category: 'value' },
        });
        if (data.values.length > 0) {
          await tx.profileAttribute.createMany({
            data: data.values.map((v) => ({
              profileId: profile.id,
              category: 'value',
              attributeKey: v,
            })),
          });
        }
      }

      if (data.communicationStyle !== undefined) {
        await tx.profileAttribute.deleteMany({
          where: { profileId: profile.id, category: 'communication' },
        });
        if (data.communicationStyle.length > 0) {
          await tx.profileAttribute.createMany({
            data: data.communicationStyle.map((c) => ({
              profileId: profile.id,
              category: 'communication',
              attributeKey: c,
            })),
          });
        }
      }

      if (data.boundaries !== undefined) {
        await tx.profileAttribute.deleteMany({
          where: { profileId: profile.id, category: 'boundary' },
        });
        if (data.boundaries.length > 0) {
          await tx.profileAttribute.createMany({
            data: data.boundaries.map((b) => ({
              profileId: profile.id,
              category: 'boundary',
              attributeKey: b,
            })),
          });
        }
      }

      // 4. Preferences update if provided
      const prefAgeMin = data.preferences?.ageMin ?? data.ageMin;
      const prefAgeMax = data.preferences?.ageMax ?? data.ageMax;
      const prefDistance = data.preferences?.distanceMiles ?? data.distanceMax;
      if (prefAgeMin !== undefined || prefAgeMax !== undefined || prefDistance !== undefined) {
        await tx.userPreference.upsert({
          where: { userId },
          update: {
            ...(prefAgeMin !== undefined && { ageMin: prefAgeMin }),
            ...(prefAgeMax !== undefined && { ageMax: prefAgeMax }),
            ...(prefDistance !== undefined && { distanceMiles: prefDistance }),
          },
          create: {
            userId,
            ageMin: prefAgeMin ?? 25,
            ageMax: prefAgeMax ?? 45,
            distanceMiles: prefDistance ?? 50,
          },
        });
      }

      return tx.profile.findUnique({
        where: { id: profile.id },
        include: {
          photos: { orderBy: { displayOrder: 'asc' } },
          attributes: true,
        },
      });
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

      // Check existing profile to preserve registered immutable name
      const existingProfile = await tx.profile.findUnique({ where: { userId } });
      if (existingProfile?.name && data.name && data.name.trim() !== existingProfile.name) {
        throw AppError.badRequest('Name is an immutable account identifier and cannot be changed after registration.');
      }
      const finalName = existingProfile?.name || data.name.trim();

      // 2. Upsert profile
      const profile = await tx.profile.upsert({
        where: { userId },
        update: {
          name: finalName,
          age: data.age,
          pronouns: data.pronouns || '',
          location: data.location.trim(),
          latitude: coords.lat,
          longitude: coords.lon,
          occupation: data.occupation?.trim() || '',
          bio: data.bio?.trim() || '',
          lookingFor: data.lookingFor?.trim() || existingProfile?.lookingFor || 'A meaningful, long-term relationship',
          isPublished: true,
          isPaused: false,
        },
        create: {
          userId,
          name: finalName,
          age: data.age,
          pronouns: data.pronouns || '',
          location: data.location.trim(),
          latitude: coords.lat,
          longitude: coords.lon,
          occupation: data.occupation?.trim() || '',
          bio: data.bio?.trim() || '',
          lookingFor: data.lookingFor?.trim() || 'A meaningful, long-term relationship',
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
