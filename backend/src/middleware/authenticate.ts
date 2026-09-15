import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../utils/errors.js';
import type { TokenPayload } from '../plugins/jwt.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const decoded = await request.jwtVerify<TokenPayload>({ onlyCookie: false });
    request.user = decoded;
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Invalid or expired access token');
  }
}

export async function optionalAuthenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = await request.jwtVerify<TokenPayload>({ onlyCookie: false });
      request.user = decoded;
    }
  } catch (err) {
    // Ignore invalid tokens for optional authentication
  }
}
