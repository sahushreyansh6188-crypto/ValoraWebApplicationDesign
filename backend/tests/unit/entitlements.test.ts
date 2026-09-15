import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  EntitlementsService,
  PLAN_CONFIGS,
} from '../../src/modules/entitlements/entitlements.service.js';

describe('Entitlements Service', () => {
  test('Free tier has correct limits (15 views/week, 3 conversations/month)', () => {
    assert.strictEqual(PLAN_CONFIGS.free.weeklyProfileViews, 15);
    assert.strictEqual(PLAN_CONFIGS.free.monthlyConversations, 3);
    assert.strictEqual(PLAN_CONFIGS.free.hasReadReceipts, false);
    assert.strictEqual(PLAN_CONFIGS.free.hasAdvancedFilters, false);
  });

  test('Connect & Annual tiers have unlimited views and conversations', () => {
    assert.strictEqual(PLAN_CONFIGS.connect.weeklyProfileViews, Infinity);
    assert.strictEqual(PLAN_CONFIGS.connect.monthlyConversations, Infinity);
    assert.strictEqual(PLAN_CONFIGS.connect.hasReadReceipts, true);

    assert.strictEqual(PLAN_CONFIGS.annual.weeklyProfileViews, Infinity);
    assert.strictEqual(PLAN_CONFIGS.annual.hasReadReceipts, true);
  });

  test('canSeeReadReceipts permits Connect and Annual users only', () => {
    assert.strictEqual(EntitlementsService.canSeeReadReceipts('free'), false);
    assert.strictEqual(EntitlementsService.canSeeReadReceipts('connect'), true);
    assert.strictEqual(EntitlementsService.canSeeReadReceipts('annual'), true);
  });
});
