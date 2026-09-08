import type { FastifyRequest } from "fastify";
import { config } from "../config.js";

export interface CurrentUser {
  id: string;
}

/**
 * Authentication adapter for Sprint 1.
 * Replace this function with a real session/JWT resolver later; callers only
 * depend on the stable CurrentUser shape.
 */
export function getCurrentUser(request: FastifyRequest): CurrentUser {
  const headerValue = request.headers["x-dev-user-id"];
  const requestedId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const id = requestedId?.trim() || config.devUserId;

  return { id };
}
