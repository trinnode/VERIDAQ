/**
 * plugins/auth.ts
 *
 * Fastify plugin that decorates every request with two things:
 *   - request.jwtVerify()  (built into @fastify/jwt, just re-exported here)
 *   - request.actor        — the parsed JWT payload after verification
 *
 * Usage inside a route:
 *   fastify.addHook("onRequest", fastify.authenticate)
 * or per-route:
 *   { preHandler: [fastify.authenticate] }
 */

import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

interface JwtPayload {
  sub: string;       // actorId (UUID)
  role: "INSTITUTION" | "EMPLOYER" | "ADMIN";
  iat?: number;
  exp?: number;
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate so TypeScript knows about it
  fastify.decorate("authenticate", async (request: FastifyRequest) => {
    await request.jwtVerify();
  });
};

export default fp(authPlugin, {
  name: "auth",
  dependencies: ["@fastify/jwt"],
});

// Augment Fastify typings so request.actor is available everywhere
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    actor: JwtPayload;
  }
}
