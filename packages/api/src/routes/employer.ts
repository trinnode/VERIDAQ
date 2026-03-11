/**
 * routes/employer.ts
 *
 * Employers are companies/HR departments that want to verify a candidate's
 * academic credentials.  They self-register, go through a lightweight KYC
 * check (admin approves), then can run verifications.
 *
 *   POST /v1/employers/register  — create account (no auth needed)
 *   GET  /v1/employers/me        — own profile
 *   GET  /v1/employers/me/verifications  — history of verifications I triggered
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireRole } from "../middleware/requireRole.js";
import crypto from "node:crypto";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, buf) => {
      if (err) reject(err);
      else resolve(`${salt}:${buf.toString("hex")}`);
    });
  });
}

// ─── Schemas ────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  companyName:   z.string().min(2),
  email:         z.string().email(),
  password:      z.string().min(8),
  cacNumber:     z.string().min(6, "CAC registration number required"),
  contactName:   z.string().min(2),
  contactPhone:  z.string().optional(),
  contactNin:    z.string().length(11, "NIN must be exactly 11 digits").optional(),
  websiteUrl:    z.string().url().optional(),
  addressLine:   z.string().optional(),
  state:         z.string().optional(),
});

export const employerRoutes: FastifyPluginAsync = async (fastify) => {
  // -----------------------------------------------------------------------
  // POST /register  — open endpoint, no auth required
  // -----------------------------------------------------------------------
  fastify.post("/register", async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: result.error.issues.map((i) => i.message).join(", ") });
    }

    const data = result.data;

    // Check for duplicate email or CAC number
    const existing = await prisma.employer.findFirst({
      where: { OR: [{ contactEmail: data.email }, { cacNumber: data.cacNumber }] },
      select: { id: true, contactEmail: true, cacNumber: true },
    });

    if (existing) {
      const field = existing.contactEmail === data.email ? "email address" : "CAC number";
      return reply.code(409).send({ statusCode: 409, error: "Conflict", message: `An account with this ${field} already exists.` });
    }

    // Check NIN duplication if provided — prevent one person from making multiple accounts
    if (data.contactNin) {
      const ninExists = await prisma.employer.findUnique({ where: { contactNin: data.contactNin }, select: { id: true } });
      if (ninExists) {
        return reply.code(409).send({ statusCode: 409, error: "Conflict", message: "An account linked to this NIN already exists." });
      }
    }

    const passwordHash = await hashPassword(data.password);

    const employer = await prisma.employer.create({
      data: {
        companyName:   data.companyName,
        contactEmail:  data.email,
        passwordHash,
        cacNumber:     data.cacNumber,
        contactName:   data.contactName,
        contactPhone:  data.contactPhone,
        contactNin:    data.contactNin,
        websiteUrl:    data.websiteUrl,
        addressLine:   data.addressLine,
        state:         data.state,
        kycStatus:     "PENDING",
        subscriptionTier: "FREE",
        isActive:      false,
      },
      select: { id: true, companyName: true, contactEmail: true, kycStatus: true },
    });

    return reply.code(201).send({
      ...employer,
      message: "Registration successful. Your account is pending KYC review.",
    });
  });

  // -----------------------------------------------------------------------
  // All routes below this require authentication + EMPLOYER role
  // -----------------------------------------------------------------------
  fastify.addHook("onRequest", fastify.authenticate);
  fastify.addHook("preHandler", requireRole("EMPLOYER"));

  // GET /me
  fastify.get("/me", async (request, reply) => {
    const user = request.user as { sub: string };
    const employer = await prisma.employer.findUnique({
      where: { id: user.sub },
      select: {
        id:              true,
        companyName:     true,
        contactEmail:    true,
        cacNumber:       true,
        contactName:     true,
        contactPhone:    true,
        kycStatus:       true,
        subscriptionTier: true,
        isActive:        true,
        createdAt:       true,
      },
    });

    if (!employer) {
      return reply.code(404).send({ statusCode: 404, error: "Not Found", message: "Employer not found." });
    }

    return reply.send(employer);
  });

  // GET /me/verifications  — paginated list of verifications I initiated
  fastify.get("/me/verifications", async (request, reply) => {
    const user  = request.user as { sub: string };
    const query = request.query as Record<string, string>;
    const page  = parseInt(query["page"] ?? "1", 10);
    const limit = parseInt(query["limit"] ?? "20", 10);
    const skip  = (page - 1) * limit;

    const [total, records] = await Promise.all([
      prisma.verificationRequest.count({ where: { employerId: user.sub } }),
      prisma.verificationRequest.findMany({
        where:   { employerId: user.sub },
        orderBy: { requestedAt: "desc" },
        skip,
        take:    limit,
        select: {
          id:          true,
          status:      true,
          claimCode:   true,
          claimTypeCode: true,
          requestedAt: true,
          resolvedAt:  true,
        },
      }),
    ]);

    return reply.send({ total, page, limit, records });
  });
};
