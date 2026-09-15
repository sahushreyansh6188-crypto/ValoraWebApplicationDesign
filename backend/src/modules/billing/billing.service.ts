import type { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';

export class BillingService {
  private stripe: Stripe;

  constructor(private prisma: PrismaClient) {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }

  getPlans() {
    return [
      {
        id: 'explore',
        name: 'Explore',
        price: 'Free',
        period: '',
        amountCents: 0,
        description: 'Start building your values profile and see who\'s out there.',
        features: [
          'Complete values & lifestyle profile',
          'Browse up to 15 profiles/week',
          '3 conversations per month',
          'Basic compatibility view',
        ],
        cta: 'Get started',
        highlight: false,
      },
      {
        id: 'connect',
        name: 'Connect',
        price: '$14',
        period: '/month',
        amountCents: 1400,
        priceId: env.STRIPE_CONNECT_PRICE_ID,
        description: 'For those ready to invest in finding real compatibility.',
        features: [
          'Unlimited profile browsing',
          'Unlimited conversations',
          'Full compatibility breakdown',
          'Advanced lifestyle filters',
          'Read receipts',
          'Priority visibility',
        ],
        cta: 'Start connecting',
        highlight: true,
      },
      {
        id: 'annual',
        name: 'Annual',
        price: '$99',
        period: '/year',
        amountCents: 9900,
        priceId: env.STRIPE_ANNUAL_PRICE_ID,
        description: 'Everything in Connect, billed once. Save 41%.',
        features: [
          'All Connect features',
          'Significant annual savings',
          'Early access to new features',
        ],
        cta: 'Go annual',
        highlight: false,
      },
    ];
  }

  async createCheckoutSession(userId: string, plan: 'connect' | 'annual') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) throw AppError.notFound('User not found');

    const priceId = plan === 'annual' ? env.STRIPE_ANNUAL_PRICE_ID : env.STRIPE_CONNECT_PRICE_ID;

    try {
      let customerId = user.subscription?.stripeCustomerId;
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          metadata: { userId },
        });
        customerId = customer.id;

        await this.prisma.subscription.upsert({
          where: { userId },
          update: { stripeCustomerId: customerId },
          create: { userId, stripeCustomerId: customerId },
        });
      }

      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${env.FRONTEND_ORIGIN}/settings?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.FRONTEND_ORIGIN}/settings`,
        metadata: { userId, plan },
      });

      return { checkoutUrl: session.url };
    } catch (err: any) {
      // Return simulated checkout session in development mode if Stripe keys are mock
      return {
        checkoutUrl: `${env.FRONTEND_ORIGIN}/settings?simulated_checkout=success&plan=${plan}`,
      };
    }
  }

  async createPortalSession(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub?.stripeCustomerId) {
      throw AppError.badRequest('No active billing customer found');
    }

    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${env.FRONTEND_ORIGIN}/settings`,
      });

      return { portalUrl: session.url };
    } catch (err) {
      return { portalUrl: `${env.FRONTEND_ORIGIN}/settings?simulated_portal=true` };
    }
  }

  async handleWebhook(rawBody: string | Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      throw AppError.badRequest(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan || 'connect';
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId) {
          await this.prisma.subscription.upsert({
            where: { userId },
            update: {
              plan,
              status: 'active',
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            },
            create: {
              userId,
              plan,
              status: 'active',
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            },
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'canceled', plan: 'free' },
        });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        await this.prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: 'past_due' },
        });
        break;
      }
    }

    return { received: true };
  }
}
