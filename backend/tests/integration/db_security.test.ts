import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Phase 8: Database Security & RLS Enforcement Suite', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  before(async () => {
    app = await buildApp();
    await app.ready();
    prisma = app.prisma;
  });

  after(async () => {
    await app.close();
  });

  test('1. RLS is explicitly enabled on all 15 public domain tables', async () => {
    const expectedTables = [
      'User',
      'Profile',
      'ProfilePhoto',
      'ProfileAttribute',
      'UserPreference',
      'UserSetting',
      'Subscription',
      'ConnectionRequest',
      'Match',
      'Conversation',
      'Message',
      'Notification',
      'Block',
      'Report',
      'AuditLog',
    ];

    const result = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;

    const rlsMap = new Map(result.map((r) => [r.tablename, r.rowsecurity]));

    for (const table of expectedTables) {
      assert.strictEqual(
        rlsMap.get(table),
        true,
        `Table public."${table}" must have Row Level Security enabled (rowsecurity = true)`
      );
    }
  });

  test('2. Unauthorized direct PostgREST roles (anon) are strictly denied on sensitive tables', async () => {
    const sensitiveTables = [
      'User',
      'AuditLog',
      'Report',
      'Subscription',
      'Conversation',
      'Message',
      'Block',
      'Notification',
      'UserSetting',
      'UserPreference',
    ];

    for (const table of sensitiveTables) {
      let errorThrown = false;
      try {
        await prisma.$executeRawUnsafe(`
          DO $$
          BEGIN
            PERFORM * FROM public."${table}";
          END $$;
        `);
      } catch {
        errorThrown = true;
      }
      // Running under postgres role succeeds, but testing under anon role must be denied
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          -- Verify permission is revoked for anon role
          IF has_table_privilege('anon', 'public."${table}"', 'SELECT') THEN
            RAISE EXCEPTION 'anon role has unexpected SELECT privilege on %', '${table}';
          END IF;
          IF has_table_privilege('authenticated', 'public."${table}"', 'INSERT') THEN
            RAISE EXCEPTION 'authenticated role has unexpected direct INSERT privilege on %', '${table}';
          END IF;
        END $$;
      `);
    }
  });

  test('3. Backend Prisma operational connection bypasses RLS safely and performs queries', async () => {
    // Verifying standard operations across sensitive models
    const userCount = await prisma.user.count();
    const profileCount = await prisma.profile.count();
    const matchCount = await prisma.match.count();
    const conversationCount = await prisma.conversation.count();
    const auditCount = await prisma.auditLog.count();

    assert.ok(userCount >= 1, 'Prisma should read User table');
    assert.ok(profileCount >= 1, 'Prisma should read Profile table');
    assert.ok(matchCount >= 0, 'Prisma should read Match table');
    assert.ok(conversationCount >= 0, 'Prisma should read Conversation table');
    assert.ok(auditCount >= 0, 'Prisma should read AuditLog table');
  });

  test('4. IDOR Protection: Cross-user private conversation isolation preserved via API', async () => {
    // Fetch an existing conversation from DB
    const conversation = await prisma.conversation.findFirst({
      include: { user1: true, user2: true },
    });

    if (conversation) {
      // Create an unauthorized outsider (Charlie)
      const outsiderEmail = `charlie_idor_${Date.now()}@example.com`;
      const signupRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: {
          email: outsiderEmail,
          password: 'Password123!',
          name: 'Charlie Outsider',
          termsAccepted: true,
        },
      });
      const signupJson = JSON.parse(signupRes.payload);
      const charlieToken = signupJson.data.accessToken;

      // Charlie attempts to view conversation messages
      const accessRes = await app.inject({
        method: 'GET',
        url: `/api/v1/messaging/conversations/${conversation.id}/messages`,
        headers: { authorization: `Bearer ${charlieToken}` },
      });

      assert.strictEqual(
        accessRes.statusCode,
        403,
        'Outsider must receive 403 Forbidden when attempting to read another users conversation'
      );

      // Charlie attempts to send message to conversation
      const sendRes = await app.inject({
        method: 'POST',
        url: `/api/v1/messaging/conversations/${conversation.id}/messages`,
        headers: { authorization: `Bearer ${charlieToken}` },
        payload: { text: 'Unauthorized intrusion attempt' },
      });

      assert.strictEqual(
        sendRes.statusCode,
        403,
        'Outsider must receive 403 Forbidden when attempting to send a message to another users conversation'
      );

      // Cleanup outsider
      await prisma.user.delete({ where: { id: signupJson.data.user.id } });
    }
  });

  test('5. Non-admin user cannot view audit logs or moderation reports', async () => {
    const userEmail = `audittest_${Date.now()}@example.com`;
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: userEmail,
        password: 'Password123!',
        name: 'Regular User',
        termsAccepted: true,
      },
    });
    const signupJson = JSON.parse(signupRes.payload);
    const regularToken = signupJson.data.accessToken;

    // Attempt to access admin overview
    const overviewRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/overview',
      headers: { authorization: `Bearer ${regularToken}` },
    });
    assert.strictEqual(overviewRes.statusCode, 403, 'Regular user must receive 403 on admin overview');

    // Attempt to access admin reports
    const reportsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reports',
      headers: { authorization: `Bearer ${regularToken}` },
    });
    assert.strictEqual(reportsRes.statusCode, 403, 'Regular user must receive 403 on admin reports');

    // Cleanup
    await prisma.user.delete({ where: { id: signupJson.data.user.id } });
  });
});
