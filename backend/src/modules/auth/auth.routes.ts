import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { sendSuccess } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/authenticate.js';

const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    agreedTerms: z.boolean().optional(),
    termsAccepted: z.boolean().optional(),
  })
  .refine((d) => d.agreedTerms === true || d.termsAccepted === true, {
    message: 'You must agree to the terms to continue',
    path: ['agreedTerms'],
  });

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  requireTwoFactor: z.boolean().optional(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify.prisma);

  /**
   * Helper to issue JWT access and refresh token pair
   */
  const issueTokens = (user: { id: string; email: string; role: string; isVerified: boolean; hasProfile?: boolean }, reply: any) => {
    const accessToken = fastify.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        hasProfile: user.hasProfile || false,
      },
      { expiresIn: '15m' }
    );

    const refreshToken = fastify.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '30d' }
    );

    reply.setCookie('valora_refresh_token', refreshToken, {
      path: '/api/v1/auth/refresh',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    return { accessToken, refreshToken, expiresIn: 900 };
  };

  /**
   * Phase 3 & 4: Sign up with strong password validation and immutable fields
   */
  const handleSignup = async (request: any, reply: any) => {
    const body = signupSchema.parse(request.body);
    const result = await authService.signup(body);
    const tokens = issueTokens(result.user, reply);

    return sendSuccess(
      reply,
      {
        ...result,
        ...tokens,
      },
      201
    );
  };
  fastify.post('/signup', handleSignup);
  fastify.put('/signup', handleSignup);
  fastify.patch('/signup', handleSignup);

  /**
   * Phase 6: Step 1 Login - verifies password and dispatches secure Email OTP (or issues session if 2FA not required)
   */
  const handleLogin = async (request: any, reply: any) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login(body);
    if (result.user && !result.requiresOtp) {
      const tokens = issueTokens(result.user, reply);
      return sendSuccess(reply, {
        ...result,
        ...tokens,
      });
    }
    return sendSuccess(reply, result);
  };
  fastify.post('/login', handleLogin);
  fastify.put('/login', handleLogin);
  fastify.patch('/login', handleLogin);
  fastify.get('/login', async (_request, reply) => {
    return sendSuccess(reply, { status: 'ready', message: 'Login endpoint active' });
  });

  /**
   * Phase 6: Step 2 Login - verifies Email OTP and establishes authenticated session
   */
  const handleLoginOtp = async (request: any, reply: any) => {
    const { email, code } = z
      .object({
        email: z.string().email('Enter a valid email address'),
        code: z.string().min(4, 'Code must be at least 4 characters'),
      })
      .parse(request.body);

    const result = await authService.verifyLoginOtp(email, code);
    const tokens = issueTokens(result.user, reply);

    return sendSuccess(reply, {
      ...tokens,
      user: result.user,
    });
  };
  fastify.post('/login-otp', handleLoginOtp);
  fastify.put('/login-otp', handleLoginOtp);
  fastify.patch('/login-otp', handleLoginOtp);

  /**
   * Logout - Clears refresh cookie and ends session
   */
  const handleLogout = async (request: any, reply: any) => {
    reply.clearCookie('valora_refresh_token', {
      path: '/api/v1/auth/refresh',
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    return sendSuccess(reply, { message: 'Logged out successfully' });
  };
  fastify.post('/logout', handleLogout);
  fastify.put('/logout', handleLogout);
  fastify.patch('/logout', handleLogout);
  fastify.get('/logout', handleLogout);

  /**
   * Session refresh token rotation
   */
  fastify.post('/refresh', async (request, reply) => {
    const refreshToken =
      request.cookies?.valora_refresh_token || (request.body as any)?.refreshToken;
    if (!refreshToken) {
      throw AppError.unauthorized('No refresh token provided');
    }

    try {
      const decoded = fastify.jwt.verify<{ sub: string; type: string }>(refreshToken);
      if (decoded.type !== 'refresh') {
        throw AppError.unauthorized('Invalid refresh token type');
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { profile: true },
      });

      if (
        !user ||
        user.accountStatus === 'suspended' ||
        user.accountStatus === 'banned' ||
        user.accountStatus === 'deleted'
      ) {
        throw AppError.unauthorized('User not found or account is inactive');
      }

      const newAccessToken = fastify.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          hasProfile: user.profile?.isPublished || false,
        },
        { expiresIn: '15m' }
      );

      return sendSuccess(reply, { accessToken: newAccessToken });
    } catch (err) {
      throw AppError.unauthorized('Expired or invalid refresh token');
    }
  });

  /**
   * Phase 8: Forgot password (timing-safe)
   */
  fastify.post('/forgot-password', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body);
    const result = await authService.forgotPassword(email);
    return sendSuccess(reply, result);
  });

  /**
   * Phase 8: Reset password with token
   */
  fastify.post('/reset-password', async (request, reply) => {
    const { token, newPassword } = z
      .object({
        token: z.string().min(1, 'Token is required'),
        newPassword: z.string().min(8, 'Password must be at least 8 characters'),
      })
      .parse(request.body);

    const result = await authService.resetPassword(token, newPassword);
    return sendSuccess(reply, result);
  });

  /**
   * Phase 5: Email Verification link handler
   */
  fastify.post('/verify-email', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.body);
    const result = await authService.verifyEmail(token);
    return sendSuccess(reply, result);
  });

  /**
   * Phase 9: Google OAuth integration
   */
  fastify.post('/google', async (request, reply) => {
    const body = z
      .object({
        code: z.string().optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        photoUrl: z.string().optional(),
      })
      .parse(request.body || {});

    const result = await authService.googleAuth(body);
    const tokens = issueTokens(result.user, reply);

    return sendSuccess(reply, {
      ...tokens,
      user: result.user,
    });
  });

  /**
   * Phase 10: Facebook / Meta OAuth integration
   */
  fastify.post('/facebook', async (request, reply) => {
    const body = z
      .object({
        accessToken: z.string().optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        facebookId: z.string().optional(),
        photoUrl: z.string().optional(),
      })
      .parse(request.body || {});

    const result = await authService.facebookAuth(body);
    const tokens = issueTokens(result.user, reply);

    return sendSuccess(reply, {
      ...tokens,
      user: result.user,
    });
  });

  /**
   * General OTP Dispatch
   */
  const handleOtpSend = async (request: any, reply: any) => {
    const { email, purpose } = z
      .object({
        email: z.string().email('Enter a valid email address'),
        purpose: z.enum(['signup', 'login']).default('signup'),
      })
      .parse(request.body);

    const result = await authService.sendOtp(email, purpose);
    return sendSuccess(reply, result);
  };
  fastify.post('/otp/send', handleOtpSend);
  fastify.put('/otp/send', handleOtpSend);
  fastify.patch('/otp/send', handleOtpSend);

  /**
   * General OTP Verification
   */
  const handleOtpVerify = async (request: any, reply: any) => {
    const body = z
      .object({
        email: z.string().email('Enter a valid email address'),
        code: z.string().min(4, 'Code must be at least 4 characters'),
        purpose: z.enum(['signup', 'login']).default('signup'),
        name: z.string().optional(),
        password: z.string().optional(),
      })
      .parse(request.body);

    const result = await authService.verifyOtp(body);
    const tokens = issueTokens(result.user, reply);

    return sendSuccess(reply, {
      ...tokens,
      user: result.user,
    });
  };
  fastify.post('/otp/verify', handleOtpVerify);
  fastify.put('/otp/verify', handleOtpVerify);
  fastify.patch('/otp/verify', handleOtpVerify);

  /**
   * Phase 14: Sensitive action re-authentication
   */
  fastify.post('/reauthenticate', { preHandler: [authenticate] }, async (request, reply) => {
    const { password } = z.object({ password: z.string() }).parse(request.body);
    const result = await authService.reauthenticate(request.user!.sub, password);
    return sendSuccess(reply, result);
  });

  /**
   * Phase 17: Admin stepped-up authentication
   */
  fastify.post('/admin/mfa/verify', { preHandler: [authenticate] }, async (request, reply) => {
    const { mfaCode } = z.object({ mfaCode: z.string().length(6) }).parse(request.body);
    const result = await authService.verifyAdminMfa(request.user!.sub, mfaCode);
    return sendSuccess(reply, result);
  });
};

export default authRoutes;
