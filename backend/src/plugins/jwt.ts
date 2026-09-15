import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';

export interface TokenPayload {
  sub: string;
  email?: string;
  role?: string;
  isVerified?: boolean;
  hasProfile?: boolean;
  type?: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}

export const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: 'onRequest',
  });

  await fastify.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: {
      expiresIn: '15m', // 15-minute access token as specified in contract
    },
  });
};

export default fp(jwtPlugin);
