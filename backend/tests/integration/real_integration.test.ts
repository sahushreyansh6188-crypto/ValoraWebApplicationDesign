import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { WebSocket } from 'ws';
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('VALORA Real Integration & End-to-End Validation', () => {
  let app: FastifyInstance;
  let serverPort: number;

  // Test User A (Alice) state
  let aliceToken: string;
  let aliceRefreshToken: string;
  let aliceId: string;

  // Test User B (Bob) state
  let bobToken: string;
  let bobId: string;

  // Admin state
  let adminToken: string;

  // Shared state
  let mutualConversationId: string;
  let testMessageId: string;

  before(async () => {
    app = buildApp();
    const addr = await app.listen({ port: 0, host: '127.0.0.1' });
    serverPort = (app.server.address() as any).port;
  });

  after(async () => {
    await app.close();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 3 & 4: REAL USER JOURNEY & REST API VALIDATION
  // ───────────────────────────────────────────────────────────────────────────

  test('1. User A (Alice) signup, email verification, and login', async () => {
    const email = `alice_${Date.now()}@example.com`;
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email,
        password: 'Password123!',
        name: 'Alice',
        termsAccepted: true,
      },
    });

    assert.strictEqual(signupRes.statusCode, 201, `Signup failed: ${signupRes.payload}`);
    const signupJson = JSON.parse(signupRes.payload);
    assert.strictEqual(signupJson.success, true);
    assert.strictEqual(signupJson.data.user.email, email);
    aliceId = signupJson.data.user.id;
    aliceToken = signupJson.data.accessToken;
    aliceRefreshToken = signupJson.data.refreshToken;

    // Verify Email
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email',
      payload: { token: 'demo_token_123' },
    });
    assert.strictEqual(verifyRes.statusCode, 200);

    // Refresh Token flow
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: aliceRefreshToken },
    });
    assert.strictEqual(refreshRes.statusCode, 200);
    const refreshJson = JSON.parse(refreshRes.payload);
    assert.ok(refreshJson.data.accessToken);
    aliceToken = refreshJson.data.accessToken;

    // Login with valid credentials
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email,
        password: 'Password123!',
      },
    });
    assert.strictEqual(loginRes.statusCode, 200);
    const loginJson = JSON.parse(loginRes.payload);
    assert.strictEqual(loginJson.success, true);
    aliceToken = loginJson.data.accessToken;
  });

  test('2. User A (Alice) completes 8-step onboarding and publishes profile', async () => {
    const onboardingRes = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/onboarding',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        name: 'Alice',
        age: 28,
        pronouns: 'she/her',
        location: 'Seattle, WA',
        occupation: 'Architect',
        bio: 'Designing sustainable spaces and exploring alpine trails.',
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'],
        lifestyle: ['vegan', 'outdoor lifestyle', 'zero-waste'],
        values: ['authenticity', 'creativity', 'growth', 'simplicity'],
        communicationStyle: ['direct communicator', 'quality time focused'],
        boundaries: ['slow-paced dating', 'monogamy only'],
        lookingFor: 'A long-term intentional partner',
        ageMin: 26,
        ageMax: 38,
        distanceMax: 50,
      },
    });

    assert.strictEqual(onboardingRes.statusCode, 200, `Onboarding failed: ${onboardingRes.payload}`);
    const json = JSON.parse(onboardingRes.payload);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.name, 'Alice');
    assert.strictEqual(json.data.occupation, 'Architect');

    // Verify GET /profiles/me
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/profiles/me',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    assert.strictEqual(meRes.statusCode, 200);
    const meJson = JSON.parse(meRes.payload);
    assert.strictEqual(meJson.data.name, 'Alice');
    assert.deepStrictEqual([...meJson.data.lifestyle].sort(), ['vegan', 'outdoor lifestyle', 'zero-waste'].sort());
  });

  test('3. User B (Bob) signup, onboarding, and publishes profile', async () => {
    const email = `bob_${Date.now()}@example.com`;
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email,
        password: 'Password123!',
        name: 'Bob',
        termsAccepted: true,
      },
    });
    assert.strictEqual(signupRes.statusCode, 201);
    const signupJson = JSON.parse(signupRes.payload);
    bobId = signupJson.data.user.id;
    bobToken = signupJson.data.accessToken;

    const onboardingRes = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/onboarding',
      headers: { authorization: `Bearer ${bobToken}` },
      payload: {
        name: 'Bob',
        age: 30,
        pronouns: 'he/him',
        location: 'Seattle, WA',
        occupation: 'Environmental Scientist',
        bio: 'Passionate about conservation, slow living, and trail running.',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'],
        lifestyle: ['vegan', 'outdoor lifestyle', 'mindfulness practice'],
        values: ['authenticity', 'growth', 'simplicity', 'compassion'],
        communicationStyle: ['direct communicator', 'loves long conversations'],
        boundaries: ['slow-paced dating', 'monogamy only'],
        lookingFor: 'Intentional connection',
        ageMin: 25,
        ageMax: 35,
        distanceMax: 60,
      },
    });

    assert.strictEqual(onboardingRes.statusCode, 200);
    const json = JSON.parse(onboardingRes.payload);
    assert.strictEqual(json.data.name, 'Bob');
  });

  test('4. Discovery & Compatibility Scoring: Alice discovers Bob and scores alignment', async () => {
    const feedRes = await app.inject({
      method: 'GET',
      url: '/api/v1/discovery/feed',
      headers: { authorization: `Bearer ${aliceToken}` },
    });

    assert.strictEqual(feedRes.statusCode, 200);
    const feedJson = JSON.parse(feedRes.payload);
    assert.strictEqual(feedJson.success, true);
    assert.ok(Array.isArray(feedJson.data));

    // Bob should be in Alice's feed with a high compatibility score (shared vegan, outdoor, authenticity, etc.)
    const bobCard = feedJson.data.find((p: any) => p.id === bobId);
    assert.ok(bobCard, 'Bob should appear in Alice discovery feed');
    assert.ok(bobCard.compatibilityScore >= 60, `Expected compatibility >= 60, got ${bobCard.compatibilityScore}`);

    // Pass Action test
    const passRes = await app.inject({
      method: 'POST',
      url: `/api/v1/discovery/pass/${bobCard.id}`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    assert.strictEqual(passRes.statusCode, 200);
  });

  test('5. Mutual Connection Journey: Alice & Bob reach out -> Match & Conversation created', async () => {
    // Alice reaches out to Bob
    const reachOutA = await app.inject({
      method: 'POST',
      url: '/api/v1/connections/reach-out',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { targetUserId: bobId },
    });

    assert.strictEqual(reachOutA.statusCode, 200);
    const reachAJson = JSON.parse(reachOutA.payload);
    assert.strictEqual(reachAJson.data.status, 'sent');

    // Bob reaches out to Alice -> Triggers mutual match!
    const reachOutB = await app.inject({
      method: 'POST',
      url: '/api/v1/connections/reach-out',
      headers: { authorization: `Bearer ${bobToken}` },
      payload: { targetUserId: aliceId },
    });

    assert.strictEqual(reachOutB.statusCode, 200);
    const reachBJson = JSON.parse(reachOutB.payload);
    assert.strictEqual(reachBJson.data.status, 'matched');
    assert.ok(reachBJson.data.conversationId, 'Expected conversationId upon mutual match');
    mutualConversationId = reachBJson.data.conversationId;

    // Verify Matches endpoint for Alice
    const matchesRes = await app.inject({
      method: 'GET',
      url: '/api/v1/connections/matches',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    assert.strictEqual(matchesRes.statusCode, 200);
    const matchesJson = JSON.parse(matchesRes.payload);
    const matchedBob = matchesJson.data.find((p: any) => p.id === bobId);
    assert.ok(matchedBob, 'Bob should appear in Alice matches');

    // Verify Notifications created for Bob
    const notifsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { authorization: `Bearer ${bobToken}` },
    });
    assert.strictEqual(notifsRes.statusCode, 200);
    const notifsJson = JSON.parse(notifsRes.payload);
    assert.ok(notifsJson.data.length > 0, 'Bob should have match notification');
  });

  test('6. Real-time Messaging & Read Receipts over HTTP and WebSockets', async () => {
    // Connect Bob to WebSocket to verify live message receipt
    const wsUrl = `ws://127.0.0.1:${serverPort}/ws/chat?token=${bobToken}`;
    const bobWs = new WebSocket(wsUrl);

    let receivedWsMessage: any = null;
    await new Promise<void>((resolve, reject) => {
      bobWs.on('open', () => resolve());
      bobWs.on('error', reject);
      bobWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'message:received') {
            receivedWsMessage = parsed.payload;
          }
        } catch {}
      });
    });

    // Alice sends message to Bob
    const sendMsgRes = await app.inject({
      method: 'POST',
      url: `/api/v1/messaging/conversations/${mutualConversationId}/messages`,
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { text: 'Hi Bob! Loved your note on conservation.' },
    });

    assert.strictEqual(sendMsgRes.statusCode, 201);
    const sendMsgJson = JSON.parse(sendMsgRes.payload);
    assert.strictEqual(sendMsgJson.data.text, 'Hi Bob! Loved your note on conservation.');
    assert.strictEqual(sendMsgJson.data.senderId, 'me'); // serialized as "me" for sender Alice
    testMessageId = sendMsgJson.data.id;

    // Allow brief moment for WebSocket event dispatch
    await new Promise((r) => setTimeout(r, 200));
    bobWs.close();

    assert.ok(receivedWsMessage, 'Bob should receive message:received event via WebSocket');
    assert.strictEqual(receivedWsMessage.text, 'Hi Bob! Loved your note on conservation.');

    // Bob marks conversation as read
    const markReadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/messaging/conversations/${mutualConversationId}/read`,
      headers: { authorization: `Bearer ${bobToken}` },
    });
    assert.strictEqual(markReadRes.statusCode, 200);
  });

  test('7. Settings, Privacy Preferences, and Account Updates', async () => {
    // Update settings
    const updateSettingsRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/settings/notifications',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        emailMatches: false,
        emailMessages: true,
      },
    });
    assert.strictEqual(updateSettingsRes.statusCode, 200);

    const updatePrivacyRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/settings/privacy',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        showLastActive: false,
        showApproxLocation: true,
      },
    });
    assert.strictEqual(updatePrivacyRes.statusCode, 200);

    // Fetch settings
    const getSettingsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/settings',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    assert.strictEqual(getSettingsRes.statusCode, 200);
    const settingsJson = JSON.parse(getSettingsRes.payload);
    assert.strictEqual(settingsJson.data.notifications.emailMatches, false);
    assert.strictEqual(settingsJson.data.privacy.showLastActive, false);
  });

  test('8. Safety Actions: Report, Block, Unblock, and Unmatch', async () => {
    // Alice reports a concern
    const reportRes = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/report',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        targetUserId: bobId,
        reason: 'Misleading profile details',
        description: 'Profile stated 5 miles away, actual distance is different.',
      },
    });
    assert.strictEqual(reportRes.statusCode, 200);

    // Alice blocks Bob
    const blockRes = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/block',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { targetUserId: bobId, reason: 'Personal preference' },
    });
    assert.strictEqual(blockRes.statusCode, 200);

    // Alice unblocks Bob
    const unblockRes = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/unblock',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { targetUserId: bobId },
    });
    assert.strictEqual(unblockRes.statusCode, 200);

    // Alice unmatches Bob
    const unmatchRes = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/unmatch',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { targetUserId: bobId, reason: 'No longer interested' },
    });
    assert.strictEqual(unmatchRes.statusCode, 200);
  });

  test('9. Admin APIs: Overview, User Management, Reports, and Moderation', async () => {
    // Login as seeded Admin
    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@valora.com',
        password: 'Password123!',
      },
    });
    assert.strictEqual(adminLoginRes.statusCode, 200);
    adminToken = JSON.parse(adminLoginRes.payload).data.accessToken;

    // Admin overview KPIs
    const overviewRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/overview',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(overviewRes.statusCode, 200);
    const overviewJson = JSON.parse(overviewRes.payload);
    assert.ok(overviewJson.data.statCards.length >= 6);

    // Admin users list
    const usersRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(usersRes.statusCode, 200);
    const usersJson = JSON.parse(usersRes.payload);
    assert.ok(usersJson.data.length > 0);

    // Admin suspend user
    const suspendRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${bobId}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { accountStatus: 'suspended', reason: 'Admin test' },
    });
    assert.strictEqual(suspendRes.statusCode, 200);

    // Admin reinstate user
    const reinstateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${bobId}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { accountStatus: 'active', reason: 'Admin review completed' },
    });
    assert.strictEqual(reinstateRes.statusCode, 200);

    // Admin reports
    const reportsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reports',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(reportsRes.statusCode, 200);
    const reportsJson = JSON.parse(reportsRes.payload);
    if (reportsJson.data.length > 0) {
      const reportId = reportsJson.data[0].id;
      const updateReportRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/reports/${reportId}/status`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: 'resolved', notes: 'Reviewed and closed' },
      });
      assert.strictEqual(updateReportRes.statusCode, 200);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 5: AUTHORIZATION & SECURITY FAILURE MODES (NEGATIVE TESTING)
  // ───────────────────────────────────────────────────────────────────────────

  test('10. Security: Non-admin user cannot access admin APIs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/overview',
      headers: { authorization: `Bearer ${aliceToken}` },
    });

    assert.strictEqual(res.statusCode, 403, 'Regular user must receive 403 Forbidden on admin route');
    const json = JSON.parse(res.payload);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, 'FORBIDDEN');
  });

  test('11. Security: Requests with invalid or expired JWT fail safely', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/profiles/me',
      headers: { authorization: 'Bearer invalid_garbage_token' },
    });

    assert.strictEqual(res.statusCode, 401, 'Invalid token must return 401 Unauthorized');
    const json = JSON.parse(res.payload);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, 'UNAUTHORIZED');
  });

  test('12. Security: Requests with malformed bodies fail validation safely', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: 'not-an-email',
        password: 'short',
      },
    });

    assert.strictEqual(res.statusCode, 400, 'Malformed body must return 400 Bad Request');
    const json = JSON.parse(res.payload);
    assert.ok(
      json.error.code === 'VALIDATION_FAILED' || json.error.code === 'VALIDATION_ERROR',
      `Expected VALIDATION_FAILED, got: ${json.error.code}`
    );
  });

  test('13. Security: IDOR prevention - Unauthorized conversation access denied', async () => {
    // Create User C (Charlie)
    const charlieSignup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: `charlie_${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Charlie',
        termsAccepted: true,
      },
    });
    const charlieToken = JSON.parse(charlieSignup.payload).data.accessToken;

    // Charlie tries to access Alice and Bob's mutual conversation
    const idorRes = await app.inject({
      method: 'GET',
      url: `/api/v1/messaging/conversations/${mutualConversationId}/messages`,
      headers: { authorization: `Bearer ${charlieToken}` },
    });

    assert.strictEqual(idorRes.statusCode, 403, 'Unauthorized conversation access must return 403');

    // Charlie tries to send message into Alice and Bob's conversation
    const idorSendRes = await app.inject({
      method: 'POST',
      url: `/api/v1/messaging/conversations/${mutualConversationId}/messages`,
      headers: { authorization: `Bearer ${charlieToken}` },
      payload: { text: 'Intruder message' },
    });

    assert.strictEqual(idorSendRes.statusCode, 403, 'Unauthorized message send must return 403');
  });
});
