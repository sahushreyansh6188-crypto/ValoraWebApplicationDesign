import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppError } from './errors.js';

export interface StandardMeta {
  timestamp: string;
  requestId: string;
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  meta: StandardMeta;
}

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200,
  pagination?: StandardMeta['pagination']
): FastifyReply {
  const meta: StandardMeta = {
    timestamp: new Date().toISOString(),
    requestId: (reply.request.id as string) || `req_${Date.now()}`,
    ...(pagination && { pagination }),
  };

  return reply.status(statusCode).send({
    success: true,
    data,
    meta,
  });
}

export function sendError(reply: FastifyReply, error: AppError): FastifyReply {
  const meta: StandardMeta = {
    timestamp: new Date().toISOString(),
    requestId: (reply.request.id as string) || `req_${Date.now()}`,
  };

  return reply.status(error.statusCode).send({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
    meta,
  });
}
