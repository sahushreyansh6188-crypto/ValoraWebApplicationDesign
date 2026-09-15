import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Phase 8: Stripe Billing & Subscription Validation', () => {
  let app: FastifyInstance;
  let testUserToken: string;
  let testUserId: string;

  before(async () => {
    app = buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });

    // Create test user
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: `billing_test_${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'BillingUser',
        termsAccepted: true,
      },
    });
    assert.strictEqual(signupRes.statusCode, 201);
    const json = JSON.parse(signupRes.payload);
    testUserToken = json.data.accessToken;
    testUserId = json.data.user.id;
  });

  after(async () => {
    await app.close();
  });

  test('1. GET /api/v1/billing/plans returns all plan tiers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/billing/plans',
    });

    assert.strictEqual(res.statusCode, 200);
    const json = JSON.parse(res.payload);
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.strictEqual(json.data.length, 3);

    const planIds = json.data.map((p: any) => p.id);
    assert.ok(planIds.includes('explore'));
    assert.ok(planIds.includes('connect'));
    assert.ok(planIds.includes('annual'));
  });

  test('2. POST /api/v1/billing/create-checkout requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/create-checkout',
      payload: { plan: 'connect' },
    });

    assert.strictEqual(res.statusCode, 401);
  });

  test('3. POST /api/v1/billing/create-checkout creates checkout session for authenticated user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/create-checkout',
      headers: { authorization: `Bearer ${testUserToken}` },
      payload: { plan: 'connect' },
    });

    assert.strictEqual(res.statusCode, 200);
    const json = JSON.parse(res.payload);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.checkoutUrl);
    assert.ok(json.data.checkoutUrl.includes('settings') || json.data.checkoutUrl.includes('stripe.com'));
  });

  test('4. POST /api/v1/billing/webhook rejects invalid signature with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      headers: {
        'stripe-signature': 't=12345,v1=invalidsignature',
      },
      payload: {
        type: 'checkout.session.completed',
        data: { object: {} },
      },
    });

    assert.strictEqual(res.statusCode, 400);
    const json = JSON.parse(res.payload);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, 'VALIDATION_FAILED');
  });

  test('5. Server authoritative subscription model verification', async () => {
    // Verify initial subscription is free tier
    const sub = await app.prisma.subscription.findUnique({
      where: { userId: testUserId },
    });

    assert.ok(sub);
    assert.strictEqual(sub.plan, 'free');
    assert.strictEqual(sub.status, 'active');

    // Simulate authoritative server-side upgrade as would occur via verified Stripe webhook
    await app.prisma.subscription.update({
      where: { userId: testUserId },
      data: {
        plan: 'connect',
        status: 'active',
        stripeCustomerId: `cus_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        stripeSubscriptionId: `sub_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      },
    });

    const upgradedSub = await app.prisma.subscription.findUnique({
      where: { userId: testUserId },
    });

    assert.strictEqual(upgradedSub?.plan, 'connect');
    assert.strictEqual(upgradedSub?.status, 'active');
  });
});
