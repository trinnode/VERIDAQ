import { createRequire } from "node:module";
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

function devTransport() {
  try {
    const require = createRequire(import.meta.url);
    require.resolve("pino-pretty");
    return { transport: { target: "pino-pretty", options: { colorize: true } } };
  } catch {
    return {};
  }
}

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === "development" ? devTransport() : {}),
    },
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(","),
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  await app.register(authPlugin);

  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  await app.register(authRoutes, { prefix: "/v1/auth" });
  await app.register(institutionRoutes, { prefix: "/v1/institutions" });
  await app.register(employerRoutes, { prefix: "/v1/employers" });
  await app.register(credentialRoutes, { prefix: "/v1/credentials" });
  await app.register(verificationRoutes, { prefix: "/v1/verifications" });
  await app.register(adminRoutes, { prefix: "/v1/admin" });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}
