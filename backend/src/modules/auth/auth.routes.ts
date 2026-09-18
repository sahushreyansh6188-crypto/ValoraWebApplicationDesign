import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { sendSuccess } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';
import { env } from '../../config/env.js';

const signupSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Must be at least 8 characters'),
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
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify.prisma);

  fastify.post('/signup', async (request, reply) => {
    const body = signupSchema.parse(request.body);
    const result = await authService.signup(body);

    const accessToken = fastify.jwt.sign(
      {
        sub: result.user.id,
        email: result.user.email,
        role: result.user.role,
        isVerified: result.user.isVerified,
        hasProfile: false,
      },
      { expiresIn: '15m' }
    );

    const refreshToken = fastify.jwt.sign(
      { sub: result.user.id, type: 'refresh' },
      { expiresIn: '30d' }
    );

    reply.setCookie('valora_refresh_token', refreshToken, {
      path: '/api/v1/auth/refresh',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    return sendSuccess(
      reply,
      {
        ...result,
        accessToken,
        refreshToken,
        expiresIn: 900,
      },
      201
    );
  });

  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login(body);

    // Generate JWT access token
    const accessToken = fastify.jwt.sign(
      {
        sub: result.user.id,
        email: result.user.email,
        role: result.user.role,
        isVerified: result.user.isVerified,
        hasProfile: result.user.hasProfile,
      },
      { expiresIn: '15m' }
    );

    // Generate long-lived refresh token
    const refreshToken = fastify.jwt.sign(
      { sub: result.user.id, type: 'refresh' },
      { expiresIn: '30d' }
    );

    // Set HttpOnly refresh token cookie (SameSite=None + Secure for cross-origin production)
    reply.setCookie('valora_refresh_token', refreshToken, {
      path: '/api/v1/auth/refresh',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return sendSuccess(reply, {
      accessToken,
      user: result.user,
    });
  });

  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie('valora_refresh_token', {
      path: '/api/v1/auth/refresh',
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    return sendSuccess(reply, { message: 'Logged out successfully' });
  });

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

  fastify.post('/forgot-password', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body);
    const result = await authService.forgotPassword(email);
    return sendSuccess(reply, result);
  });

  fastify.post('/verify-email', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.body);
    const result = await authService.verifyEmail(token);
    return sendSuccess(reply, result);
  });

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

    const accessToken = fastify.jwt.sign(
      {
        sub: result.user.id,
        email: result.user.email,
        role: result.user.role,
        isVerified: result.user.isVerified,
        hasProfile: result.user.hasProfile,
      },
      { expiresIn: '15m' }
    );

    const refreshToken = fastify.jwt.sign(
      { sub: result.user.id, type: 'refresh' },
      { expiresIn: '30d' }
    );

    reply.setCookie('valora_refresh_token', refreshToken, {
      path: '/api/v1/auth/refresh',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    return sendSuccess(reply, {
      accessToken,
      refreshToken,
      user: result.user,
    });
  });

  fastify.post('/otp/send', async (request, reply) => {
    const { email, purpose } = z
      .object({
        email: z.string().email('Enter a valid email address'),
        purpose: z.enum(['signup', 'login']).default('signup'),
      })
      .parse(request.body);

    const result = await authService.sendOtp(email, purpose);
    return sendSuccess(reply, result);
  });

  fastify.post('/otp/verify', async (request, reply) => {
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

    const accessToken = fastify.jwt.sign(
      {
        sub: result.user.id,
        email: result.user.email,
        role: result.user.role,
        isVerified: result.user.isVerified,
        hasProfile: result.user.hasProfile,
      },
      { expiresIn: '15m' }
    );

    const refreshToken = fastify.jwt.sign(
      { sub: result.user.id, type: 'refresh' },
      { expiresIn: '30d' }
    );

    reply.setCookie('valora_refresh_token', refreshToken, {
      path: '/api/v1/auth/refresh',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    return sendSuccess(reply, {
      accessToken,
      refreshToken,
      user: result.user,
    });
  });
};

export default authRoutes;
