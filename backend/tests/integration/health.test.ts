import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Server Lifecycle & Standard Protocol Envelope', () => {
  let app: FastifyInstance;

  before(async () => {
    app = buildApp();
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  test('GET /health returns healthy status and standard meta envelope', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    assert.strictEqual(response.statusCode, 200);
    const json = JSON.parse(response.payload);

    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'healthy');
    assert.strictEqual(json.data.service, 'valora-backend');
    assert.ok(json.meta.requestId, 'Missing requestId in meta');
    assert.ok(json.meta.timestamp, 'Missing timestamp in meta');
  });

  test('GET /api/v1/billing/plans returns public plan pricing without auth', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/billing/plans',
    });

    assert.strictEqual(response.statusCode, 200);
    const json = JSON.parse(response.payload);

    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.length, 3);
    assert.strictEqual(json.data[0].name, 'Explore');
    assert.strictEqual(json.data[1].name, 'Connect');
    assert.strictEqual(json.data[2].name, 'Annual');
  });

  test('GET /non-existent-route returns 404 with standard error envelope', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/non-existent-route',
    });

    assert.strictEqual(response.statusCode, 404);
    const json = JSON.parse(response.payload);

    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, 'NOT_FOUND');
    assert.ok(json.error.message);
    assert.ok(json.meta.requestId);
  });
});
