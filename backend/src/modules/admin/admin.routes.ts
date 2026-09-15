import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AdminService } from './admin.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { sendSuccess } from '../../utils/response.js';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const adminService = new AdminService(fastify.prisma);

  // Guard all admin routes with authentication and role check (admin or moderator)
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', authorize('admin', 'moderator'));

  fastify.get('/overview', async (request, reply) => {
    const overview = await adminService.getOverview();
    return sendSuccess(reply, overview);
  });

  fastify.get('/users', async (request, reply) => {
    const query = z
      .object({
        q: z.string().optional(),
        status: z.string().optional(),
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
      })
      .parse(request.query);

    const { items, total } = await adminService.getUsers(
      query.q,
      query.status,
      query.page || 1,
      query.limit || 20
    );

    return sendSuccess(reply, items, 200, {
      page: query.page || 1,
      limit: query.limit || 20,
      totalItems: total,
      totalPages: Math.ceil(total / (query.limit || 20)) || 1,
      hasNextPage: (query.page || 1) * (query.limit || 20) < total,
      hasPrevPage: (query.page || 1) > 1,
    });
  });

  const handleUpdateUserStatus = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        status: z.enum(['active', 'suspended', 'banned']).optional(),
        accountStatus: z.enum(['active', 'suspended', 'banned']).optional(),
        reason: z.string().optional(),
      })
      .refine((d) => d.status || d.accountStatus, {
        message: 'status or accountStatus is required',
      })
      .parse(request.body);

    const status = (body.status || body.accountStatus)!;
    const result = await adminService.updateUserStatus(
      request.user!.sub,
      id,
      status,
      body.reason
    );
    return sendSuccess(reply, result);
  };

  fastify.post('/users/:id/status', handleUpdateUserStatus);
  fastify.patch('/users/:id/status', handleUpdateUserStatus);

  fastify.get('/reports', async (request, reply) => {
    const { status } = request.query as { status?: string };
    const reports = await adminService.getReports(status);
    return sendSuccess(reply, reports);
  });

  const handleUpdateReport = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const { status, resolutionNotes } = z
      .object({ status: z.string(), resolutionNotes: z.string().optional() })
      .parse(request.body);

    const result = await adminService.updateReport(
      request.user!.sub,
      id,
      status,
      resolutionNotes
    );
    return sendSuccess(reply, result);
  };

  fastify.patch('/reports/:id', handleUpdateReport);
  fastify.patch('/reports/:id/status', handleUpdateReport);

  fastify.get('/moderation/flags', async (request, reply) => {
    const flags = await adminService.getModerationFlags();
    return sendSuccess(reply, flags);
  });

  fastify.get('/audit-logs', async (request, reply) => {
    const logs = await adminService.getAuditLogs();
    return sendSuccess(reply, logs);
  });

  fastify.get('/subscriptions', async (request, reply) => {
    const subs = await adminService.getSubscriptions();
    return sendSuccess(reply, subs);
  });
};

export default adminRoutes;
