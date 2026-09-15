import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  calculateJaccard,
  checkBoundaryConflict,
  calculateCompatibilityScore,
} from '../../src/config/scoring.js';

describe('Matchmaking & Compatibility Engine', () => {
  test('calculateJaccard accurately measures set similarity', () => {
    const a = ['vegan', 'zero-waste', 'mindfulness practice'];
    const b = ['vegan', 'zero-waste', 'outdoor lifestyle'];
    // 2 common / 4 total unique = 0.5
    const sim = calculateJaccard(a, b);
    assert.strictEqual(sim, 0.5);

    // Completely disjoint
    assert.strictEqual(calculateJaccard(['a'], ['b']), 0);

    // Identical
    assert.strictEqual(calculateJaccard(['a', 'b'], ['b', 'a']), 1.0);
  });

  test('checkBoundaryConflict detects mutually exclusive boundary choices', () => {
    // Conflict: monogamy vs poly-open
    assert.strictEqual(
      checkBoundaryConflict(['monogamy'], ['poly-open']),
      true
    );
    assert.strictEqual(
      checkBoundaryConflict(['poly-open'], ['monogamy']),
      true
    );

    // Compatible boundaries
    assert.strictEqual(
      checkBoundaryConflict(['slow-dating', 'monogamy'], ['slow-dating', 'monogamy']),
      false
    );
  });

  test('calculateCompatibilityScore produces normalized alignment score and shared tags', () => {
    const userA = {
      values: ['authenticity', 'growth', 'compassion'],
      lifestyle: ['vegan', 'zero-waste'],
      communicationStyle: ['direct', 'processing'],
      boundaries: ['slow-dating', 'monogamy'],
    };

    const userB = {
      values: ['authenticity', 'growth', 'simplicity'],
      lifestyle: ['vegan', 'outdoor'],
      communicationStyle: ['direct', 'text-first'],
      boundaries: ['slow-dating', 'monogamy'],
    };

    const result = calculateCompatibilityScore(userA, userB);

    assert.ok(result.score >= 65 && result.score <= 98, `Expected score between 65 and 98, got ${result.score}`);
    assert.deepStrictEqual(result.sharedValues, ['authenticity', 'growth']);
    assert.deepStrictEqual(result.sharedLifestyle, ['vegan']);
    assert.strictEqual(result.hasConflict, false);
  });
});
