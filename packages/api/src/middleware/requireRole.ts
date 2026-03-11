/**
 * middleware/requireRole.ts
 *
 * Simple hook factory that gates a route to a specific role (or list of roles).
 * Throws 403 if the authenticated actor is not in the allowed list.
 *
 * Usage:
 *   fastify.addHook("preHandler", requireRole("ADMIN"))
 *   fastify.addHook("preHandler", requireRole(["INSTITUTION", "ADMIN"]))
 */

import type { FastifyRequest, FastifyReply } from "fastify";

type Role = "INSTITUTION" | "EMPLOYER" | "ADMIN";

export function requireRole(allowed: Role | Role[]) {
  const roles: Role[] = Array.isArray(allowed) ? allowed : [allowed];

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // @fastify/jwt sets request.user after jwtVerify — we cast to our shape
    const user = request.user as { role?: Role };

    if (!user || !user.role || !roles.includes(user.role)) {
      return reply.code(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "You do not have permission to access this resource.",
      });
    }
  };
}
