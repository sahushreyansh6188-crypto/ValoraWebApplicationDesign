import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../utils/errors.js';

export function authorize(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw AppError.unauthorized('Authentication required');
    }

    const userRole = request.user.role || 'user';
    if (!allowedRoles.includes(userRole)) {
      throw AppError.forbidden(
        `Access denied. Role '${userRole}' is not authorized for this resource.`
      );
    }
  };
}
