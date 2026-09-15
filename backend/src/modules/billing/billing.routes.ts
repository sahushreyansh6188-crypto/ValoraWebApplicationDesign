import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { BillingService } from './billing.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  const billingService = new BillingService(fastify.prisma);

  fastify.get('/plans', async (request, reply) => {
    const plans = billingService.getPlans();
    return sendSuccess(reply, plans);
  });

  fastify.post('/create-checkout', { preHandler: [authenticate] }, async (request, reply) => {
    const { plan } = z.object({ plan: z.enum(['connect', 'annual']) }).parse(request.body);
    const result = await billingService.createCheckoutSession(request.user!.sub, plan);
    return sendSuccess(reply, result);
  });

  fastify.post('/create-portal', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await billingService.createPortalSession(request.user!.sub);
    return sendSuccess(reply, result);
  });

  fastify.post('/webhook', { config: { rawBody: true } }, async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string;
    const rawBody = (request as any).rawBody || JSON.stringify(request.body);
    const result = await billingService.handleWebhook(rawBody, signature);
    return reply.status(200).send(result);
  });
};

export default billingRoutes;
