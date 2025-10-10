import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';

/**
 * Request logging middleware
 */
export function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
): void {
  const startTime = Date.now();

  // Log incoming request
  request.log.info(
    {
      method: request.method,
      url: request.url,
      requestId: request.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    },
    'Incoming request'
  );

  // Log response on completion
  reply.raw.on('finish', () => {
    const duration = Date.now() - startTime;

    request.log.info(
      {
        method: request.method,
        url: request.url,
        requestId: request.id,
        statusCode: reply.statusCode,
        duration,
      },
      'Request completed'
    );
  });

  done();
}
