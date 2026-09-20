import type { FastifyRequest, FastifyReply } from 'fastify';

export async function requestLogger(request: FastifyRequest, reply: FastifyReply) {
  const start = Date.now();
  
  reply.header('X-Request-Id', request.id);

  reply.raw.on('finish', () => {
    const duration = Date.now() - start;

    if (reply.statusCode === 405) {
      request.log.error(
        {
          requestId: request.id,
          method: request.method,
          url: request.url,
          statusCode: 405,
          headers: request.headers,
          durationMs: duration,
          userId: request.user?.sub,
        },
        `[HTTP 405 Method Not Allowed] Route ${request.method} ${request.url} resulted in 405 Method Not Allowed`
      );
    }

    request.log.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: duration,
        userId: request.user?.sub,
      },
      `${request.method} ${request.url} ${reply.statusCode} - ${duration}ms`
    );
  });
}
