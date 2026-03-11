/**
 * routes/auth.ts
 *
 * Auth endpoints for institutions and employers.
 * There is no user registration here — institutions are created by the admin,
 * employers self-register through /v1/employers/register.
 *
 * POST /v1/auth/login
 *   Body: { email, password, actorType: "INSTITUTION" | "EMPLOYER" }
 *   Returns: { token, actor }
 *
 * POST /v1/auth/refresh
 *   Body: { token }
 *   Returns: { token }
 *
 * POST /v1/auth/logout
 *   Invalidates the current session (sets expiresAt to now in DB)
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import crypto from "node:crypto";

// bcrypt is too slow inside the same event loop — we use scrypt (Node built-in)
async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, buf) => {
      if (err) reject(err);
      else resolve(`${salt}:${buf.toString("hex")}`);
    });
  });
}

async function verifyPassword(stored: string, supplied: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return resolve(false);
    crypto.scrypt(supplied, salt, 64, (err, buf) => {
      if (err) reject(err);
      else resolve(crypto.timingSafeEqual(Buffer.from(hash, "hex"), buf));
    });
  });
}

const loginBodySchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(8),
  actorType: z.enum(["INSTITUTION", "EMPLOYER"]),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // -----------------------------------------------------------------------
  // POST /login
  // -----------------------------------------------------------------------
  fastify.post("/login", async (request, reply) => {
    const result = loginBodySchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        statusCode: 400,
        error:  "Bad Request",
        message: result.error.issues.map((i) => i.message).join(", "),
      });
    }

    const { email, password, actorType } = result.data;

    let actorId: string;
    let storedHash: string;
    let actorName: string;

    if (actorType === "INSTITUTION") {
      const institution = await prisma.institution.findUnique({
        where: { email },
        select: { id: true, name: true, passwordHash: true, isActive: true },
      });

      if (!institution || !institution.passwordHash) {
        return reply.code(401).send({ statusCode: 401, error: "Unauthorized", message: "Invalid credentials." });
      }

      if (!institution.isActive) {
        return reply.code(403).send({ statusCode: 403, error: "Forbidden", message: "This institution account is deactivated." });
      }

      actorId   = institution.id;
      storedHash = institution.passwordHash;
      actorName  = institution.name;
    } else {
      const employer = await prisma.employer.findUnique({
        where: { contactEmail: email },
        select: { id: true, companyName: true, passwordHash: true, isActive: true },
      });

      if (!employer || !employer.passwordHash) {
        return reply.code(401).send({ statusCode: 401, error: "Unauthorized", message: "Invalid credentials." });
      }

      if (!employer.isActive) {
        return reply.code(403).send({ statusCode: 403, error: "Forbidden", message: "This employer account is deactivated." });
      }

      actorId   = employer.id;
      storedHash = employer.passwordHash;
      actorName  = employer.companyName;
    }

    const passwordOk = await verifyPassword(storedHash, password);
    if (!passwordOk) {
      return reply.code(401).send({ statusCode: 401, error: "Unauthorized", message: "Invalid credentials." });
    }

    // Sign a JWT — payload matches what requireRole() and the audit logger expect
    const token = fastify.jwt.sign(
      { sub: actorId, role: actorType },
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    // Store sha256 of the token — never the token itself
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Write a session entry so we can invalidate it on logout
    await prisma.session.create({
      data: {
        actorId,
        actorType: actorType as "INSTITUTION" | "EMPLOYER",
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      },
    });

    return reply.send({
      token,
      actor: { id: actorId, name: actorName, role: actorType },
    });
  });

  // -----------------------------------------------------------------------
  // POST /logout  (invalidates the session in DB)
  // -----------------------------------------------------------------------
  fastify.post("/logout", {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const raw = request.headers.authorization?.replace("Bearer ", "");
    if (raw) {
      const hash = crypto.createHash("sha256").update(raw).digest("hex");
      await prisma.session.updateMany({
        where: { tokenHash: hash },
        data:  { expiresAt: new Date() },  // set to now = expired
      });
    }
    return reply.send({ message: "Logged out." });
  });
};
