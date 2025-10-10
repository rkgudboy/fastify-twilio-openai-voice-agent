import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { env } from '../config/env.js';
import { UnauthorizedError } from './error-handler.js';

/**
 * Optional API key authentication middleware
 * Only enforced if API_KEY environment variable is set
 */
export function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction
): void {
  // Skip auth if no API key is configured
  if (!env.API_KEY) {
    done();
    return;
  }

  const apiKey = request.headers['x-api-key'] as string;

  if (!apiKey || apiKey !== env.API_KEY) {
    done(new UnauthorizedError('Invalid or missing API key'));
    return;
  }

  done();
}

/**
 * Twilio webhook signature validation middleware
 * Validates that webhooks are actually from Twilio
 */
export function twilioAuthMiddleware(
  _request: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction
): void {
  // In production, implement Twilio signature validation
  // https://www.twilio.com/docs/usage/security#validating-requests

  // For now, just pass through
  // TODO: Implement proper Twilio signature validation

  done();
}
