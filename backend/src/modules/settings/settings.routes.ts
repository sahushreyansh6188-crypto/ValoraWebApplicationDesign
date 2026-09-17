import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { SettingsService } from './settings.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  const settingsService = new SettingsService(fastify.prisma);

  // Guard all settings routes with authentication
  fastify.addHook('preHandler', authenticate);

  // 1. Get Settings
  const handleGetSettings = async (request: any, reply: any) => {
    const settings = await settingsService.getSettings(request.user!.sub);
    return sendSuccess(reply, settings);
  };
  fastify.get('/', handleGetSettings);
  fastify.get('/me/settings', handleGetSettings);

  // 2. Update Settings
  const handleUpdateSettings = async (request: any, reply: any) => {
    const body = z
      .object({
        notifications: z
          .object({
            matches: z.boolean().optional(),
            messages: z.boolean().optional(),
            system: z.boolean().optional(),
            emailMatches: z.boolean().optional(),
            emailMessages: z.boolean().optional(),
            emailSystem: z.boolean().optional(),
          })
          .optional(),
        privacy: z
          .object({
            showLastActive: z.boolean().optional(),
            showLocation: z.boolean().optional(),
            showApproxLocation: z.boolean().optional(),
          })
          .optional(),
        visibility: z.boolean().optional(),
        isPaused: z.boolean().optional(),
      })
      .parse(request.body);

    const updated = await settingsService.updateSettings(request.user!.sub, body);
    return sendSuccess(reply, updated);
  };
  fastify.patch('/', handleUpdateSettings);
  fastify.patch('/me/settings', handleUpdateSettings);

  // 3. Update Notifications
  fastify.patch('/notifications', async (request, reply) => {
    const body = z
      .object({
        matches: z.boolean().optional(),
        messages: z.boolean().optional(),
        system: z.boolean().optional(),
        emailMatches: z.boolean().optional(),
        emailMessages: z.boolean().optional(),
        emailSystem: z.boolean().optional(),
      })
      .parse(request.body);

    const updated = await settingsService.updateSettings(request.user!.sub, {
      notifications: body,
    });
    return sendSuccess(reply, updated);
  });

  // 4. Update Privacy
  fastify.patch('/privacy', async (request, reply) => {
    const body = z
      .object({
        showLastActive: z.boolean().optional(),
        showLocation: z.boolean().optional(),
        showApproxLocation: z.boolean().optional(),
        isPaused: z.boolean().optional(),
      })
      .parse(request.body);

    const updated = await settingsService.updateSettings(request.user!.sub, {
      privacy: {
        showLastActive: body.showLastActive,
        showLocation: body.showLocation,
        showApproxLocation: body.showApproxLocation,
      },
      isPaused: body.isPaused,
    });
    return sendSuccess(reply, updated);
  });

  // 5. Update Account
  fastify.patch('/account', async (request, reply) => {
    const body = z
      .object({
        name: z.string().optional(),
        email: z.string().optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(8).optional(),
      })
      .parse(request.body);

    if (body.email !== undefined) {
      const user = await fastify.prisma.user.findUnique({ where: { id: request.user!.sub } });
      if (user && body.email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
        throw AppError.badRequest('Email address is an immutable account identifier and cannot be changed.');
      }
    }
    if (body.name !== undefined) {
      const profile = await fastify.prisma.profile.findUnique({ where: { userId: request.user!.sub } });
      if (profile && body.name.trim() !== profile.name) {
        throw AppError.badRequest('Name is an immutable account identifier and cannot be changed.');
      }
    }
    if (body.currentPassword && body.newPassword) {
      await settingsService.updatePassword(
        request.user!.sub,
        body.currentPassword,
        body.newPassword
      );
    }
    return sendSuccess(reply, { success: true });
  });

  // 6. Delete Account
  const handleDeleteAccount = async (request: any, reply: any) => {
    const body = z
      .object({ confirmation: z.string().optional() })
      .optional()
      .parse(request.body || {});
    const confirmation = body?.confirmation || 'delete';
    const result = await settingsService.deleteAccount(request.user!.sub, confirmation);
    return sendSuccess(reply, result);
  };
  fastify.delete('/account', handleDeleteAccount);
  fastify.delete('/me', handleDeleteAccount);
  fastify.delete('/', handleDeleteAccount);

  // 7. Preferences
  const handleGetPreferences = async (request: any, reply: any) => {
    const prefs = await settingsService.getPreferences(request.user!.sub);
    return sendSuccess(reply, prefs);
  };
  fastify.get('/me/preferences', handleGetPreferences);
  fastify.get('/preferences', handleGetPreferences);

  const handleUpdatePreferences = async (request: any, reply: any) => {
    const body = z
      .object({
        ageMin: z.number().optional(),
        ageMax: z.number().optional(),
        distanceMiles: z.number().optional(),
        lifestyleFilters: z.array(z.string()).optional(),
      })
      .parse(request.body);

    const updated = await settingsService.updatePreferences(request.user!.sub, body);
    return sendSuccess(reply, updated);
  };
  fastify.put('/me/preferences', handleUpdatePreferences);
  fastify.put('/preferences', handleUpdatePreferences);

  // 8. Direct email & password updates
  fastify.patch('/me/email', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body);
    const result = await settingsService.updateEmail(request.user!.sub, email);
    return sendSuccess(reply, result);
  });

  fastify.put('/me/password', async (request, reply) => {
    const { currentPassword, newPassword } = z
      .object({ currentPassword: z.string(), newPassword: z.string().min(8) })
      .parse(request.body);
    const result = await settingsService.updatePassword(
      request.user!.sub,
      currentPassword,
      newPassword
    );
    return sendSuccess(reply, result);
  });
};

export default settingsRoutes;
