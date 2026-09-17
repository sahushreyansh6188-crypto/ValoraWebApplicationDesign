import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ProfilesService } from './profiles.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';

const updateProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  bio: z.string().max(400).optional(),
  occupation: z.string().max(150).optional(),
  pronouns: z.string().optional(),
  location: z.string().optional(),
  age: z.number().int().min(18).max(120).optional(),
  lookingFor: z.string().optional(),
  photo: z.string().optional(),
  photos: z.array(z.string()).optional(),
  lifestyle: z.array(z.string()).optional(),
  values: z.array(z.string()).optional(),
  communicationStyle: z.array(z.string()).optional(),
  boundaries: z.array(z.string()).optional(),
  isPaused: z.boolean().optional(),
  ageMin: z.number().optional(),
  ageMax: z.number().optional(),
  distanceMax: z.number().optional(),
  preferences: z
    .object({
      ageMin: z.number().optional(),
      ageMax: z.number().optional(),
      distanceMiles: z.number().optional(),
    })
    .optional(),
});

const onboardingSchema = z.object({
  confirmedAge18: z.boolean().optional().default(true),
  name: z.string().min(1),
  age: z.number().int().min(18).max(120),
  pronouns: z.string().optional(),
  location: z.string().min(1),
  occupation: z.string().optional(),
  bio: z.string().max(400).optional(),
  photo: z.string().optional(),
  photos: z.array(z.string()).optional(),
  lifestyle: z.array(z.string()).min(1),
  values: z.array(z.string()).min(3).max(8),
  communicationStyle: z.array(z.string()).min(1),
  boundaries: z.array(z.string()).min(1),
  lookingFor: z.string().optional(),
  ageMin: z.number().optional(),
  ageMax: z.number().optional(),
  distanceMax: z.number().optional(),
  preferences: z
    .object({
      ageMin: z.number().optional(),
      ageMax: z.number().optional(),
      distanceMiles: z.number().optional(),
    })
    .optional(),
});

export const profilesRoutes: FastifyPluginAsync = async (fastify) => {
  const profilesService = new ProfilesService(fastify.prisma);

  const handleGetMyProfile = async (request: any, reply: any) => {
    const profile = await profilesService.getMyProfile(request.user!.sub);
    return sendSuccess(reply, profile);
  };
  fastify.get('/me', { preHandler: [authenticate] }, handleGetMyProfile);
  fastify.get('/', { preHandler: [authenticate] }, handleGetMyProfile);

  const handleUpdateMyProfile = async (request: any, reply: any) => {
    const body = updateProfileSchema.parse(request.body);
    const updated = await profilesService.updateMyProfile(request.user!.sub, body);
    return sendSuccess(reply, updated);
  };
  fastify.patch('/me', { preHandler: [authenticate] }, handleUpdateMyProfile);
  fastify.patch('/', { preHandler: [authenticate] }, handleUpdateMyProfile);
  fastify.put('/me', { preHandler: [authenticate] }, handleUpdateMyProfile);
  fastify.put('/', { preHandler: [authenticate] }, handleUpdateMyProfile);

  const handleSubmitOnboarding = async (request: any, reply: any) => {
    const body = onboardingSchema.parse(request.body);
    const profile = await profilesService.submitOnboarding(request.user!.sub, body);
    return sendSuccess(reply, profile, 200);
  };
  fastify.post('/onboarding', { preHandler: [authenticate] }, handleSubmitOnboarding);
  fastify.put('/onboarding', { preHandler: [authenticate] }, handleSubmitOnboarding);
  fastify.patch('/onboarding', { preHandler: [authenticate] }, handleSubmitOnboarding);

  fastify.post('/photos/upload-url', { preHandler: [authenticate] }, async (request, reply) => {
    const { fileName, fileType } = z
      .object({ fileName: z.string(), fileType: z.string() })
      .parse(request.body);
    const presigned = await profilesService.requestPhotoUpload(
      request.user!.sub,
      fileName,
      fileType
    );
    return sendSuccess(reply, presigned);
  });

  fastify.post('/photos', { preHandler: [authenticate] }, async (request, reply) => {
    const { photoUrl, isPrimary } = z
      .object({ photoUrl: z.string().url(), isPrimary: z.boolean().optional() })
      .parse(request.body);
    const photo = await profilesService.addProfilePhoto(
      request.user!.sub,
      photoUrl,
      isPrimary
    );
    return sendSuccess(reply, photo, 201);
  });

  fastify.delete('/photos/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const res = await profilesService.deleteProfilePhoto(request.user!.sub, id);
    return sendSuccess(reply, res);
  });

  fastify.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await profilesService.getPublicProfile(id);
    return sendSuccess(reply, profile);
  });
};

export default profilesRoutes;
