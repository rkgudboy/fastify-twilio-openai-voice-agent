import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../utils/logger.js';

/**
 * Global error handler for Fastify
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { method, url, id: requestId } = request;

  // Log the error with context
  logger.error(
    {
      err: error,
      requestId,
      method,
      url,
      statusCode: error.statusCode || 500,
    },
    'Request error occurred'
  );

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Build error response
  const errorResponse = {
    statusCode,
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    requestId,
    timestamp: new Date().toISOString(),
  };

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    Object.assign(errorResponse, {
      stack: error.stack,
    });
  }

  // Send error response
  reply.status(statusCode).send(errorResponse);
}

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ServiceUnavailableError extends Error {
  statusCode = 503;
  constructor(message: string) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}
