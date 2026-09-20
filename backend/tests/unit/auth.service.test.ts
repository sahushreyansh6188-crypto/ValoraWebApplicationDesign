import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../../src/modules/auth/auth.service.js';

describe('AuthService Security Architecture', () => {
  it('instantiates AuthService and provides necessary authentication methods', () => {
    // Mock prisma client
    const mockPrisma: any = {
      user: {
        findUnique: async () => null,
        create: async () => ({}),
        update: async () => ({}),
      },
      auditLog: {
        create: async () => ({}),
      },
    };

    const authService = new AuthService(mockPrisma);
    assert.strictEqual(typeof authService.signup, 'function');
    assert.strictEqual(typeof authService.login, 'function');
    assert.strictEqual(typeof authService.verifyLoginOtp, 'function');
    assert.strictEqual(typeof authService.forgotPassword, 'function');
    assert.strictEqual(typeof authService.resetPassword, 'function');
    assert.strictEqual(typeof authService.verifyEmail, 'function');
    assert.strictEqual(typeof authService.googleAuth, 'function');
    assert.strictEqual(typeof authService.facebookAuth, 'function');
    assert.strictEqual(typeof authService.reauthenticate, 'function');
    assert.strictEqual(typeof authService.verifyAdminMfa, 'function');
  });
});
