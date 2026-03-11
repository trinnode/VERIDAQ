/**
 * This is the Fastify server entry point.
 *
 * We register plugins first, then routes, then start listening.
 * The order matters: rate-limit and helmet are registered before routes
 * so every route gets those protections automatically.
 */

import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { env } from "./env.js";
import authPlugin from "./plugins/auth.js";
import { institutionRoutes } from "./routes/institution.js";
import { employerRoutes } from "./routes/employer.js";
import { credentialRoutes } from "./routes/credential.js";
import { verificationRoutes } from "./routes/verification.js";
import { adminRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { prisma } from "./db.js";

// Use pino-pretty transport in development when it's available.
// Falls back gracefully to plain JSON logs if pino-pretty isn't installed.
function devTransport() {
  try {
    require.resolve("pino-pretty");
    return { transport: { target: "pino-pretty", options: { colorize: true } } };
  } catch {
    return {};
  }
}

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV === "development" ? devTransport() : {}),
  },
});

// security headers, 10 requests per second per IP by default
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

await app.register(cors, {
  origin: env.CORS_ORIGIN.split(","),
  credentials: true,
});

// multipart needed for Excel upload endpoints
await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10 MB max upload
    files: 1,
  },
});

await app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: { expiresIn: env.JWT_EXPIRES_IN },
});

// Custom auth plugin — decorates fastify.authenticate on the instance
await app.register(authPlugin);

// health check — no auth needed
app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// all routes live under /v1
await app.register(authRoutes,         { prefix: "/v1/auth" });
await app.register(institutionRoutes,  { prefix: "/v1/institutions" });
await app.register(employerRoutes,     { prefix: "/v1/employers" });
await app.register(credentialRoutes,   { prefix: "/v1/credentials" });
await app.register(verificationRoutes, { prefix: "/v1/verifications" });
await app.register(adminRoutes,        { prefix: "/v1/admin" });

// close the database pool when the server shuts down
app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

try {
  await app.listen({
    port: env.PORT,
    host: "0.0.0.0",
  });
  app.log.info(`server is running on port ${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
