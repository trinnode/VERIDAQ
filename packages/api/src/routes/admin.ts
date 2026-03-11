/**
 * routes/admin.ts
 *
 * Platform admin operations.  Only reachable by tokens with role=ADMIN.
 * Most of these are things the VERIDAQ operations team does:
 *   - approve / reject institution KYC
 *   - approve / reject employer KYC
 *   - create an institution (gives them a portal login)
 *   - deactivate / reactivate institutions or employers
 *   - set institution on-chain tier
 *   - upgrade employer to paid tier
 *   - view audit logs
 *
 *   POST /v1/admin/institutions        — create institution
 *   PATCH /v1/admin/institutions/:id   — update any field (incl. kycStatus)
 *   PATCH /v1/admin/institutions/:id/deactivate
 *   PATCH /v1/admin/institutions/:id/reactivate
 *
 *   PATCH /v1/admin/employers/:id/kyc  — approve or reject KYC
 *   PATCH /v1/admin/employers/:id/upgrade-tier
 *   PATCH /v1/admin/employers/:id/deactivate
 *
 *   GET   /v1/admin/audit-logs         — paginated audit log
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireRole } from "../middleware/requireRole.js";
import crypto from "node:crypto";
import type { Prisma, KycStatus } from "@prisma/client";

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, buf) => {
      if (err) reject(err);
      else resolve(`${salt}:${buf.toString("hex")}`);
    });
  });
}

const createInstitutionSchema = z.object({
  name:            z.string().min(2),
  countryCode:     z.string().length(2).default("NG"),
  email:           z.string().email(),
  password:        z.string().min(10),
  onChainId:       z.string().optional(),
  websiteUrl:      z.string().url().optional(),
  logoUrl:         z.string().url().optional(),
});

const kycDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes:    z.string().optional(),
});

const updateInstitutionAdminSchema = z.object({
  name:             z.string().optional(),
  countryCode:      z.string().length(2).optional(),
  email:            z.string().email().optional(),
  onChainId:        z.string().optional(),
  subscriptionTier: z.enum(["FREE", "PAID"]).optional(),
  kycStatus:        z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "FLAGGED"]).optional(),
});

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Gate all routes to ADMIN role
  fastify.addHook("onRequest", fastify.authenticate);
  fastify.addHook("preHandler", requireRole("ADMIN"));

  // -----------------------------------------------------------------------
  // POST /institutions  — create institution + set initial password
  // -----------------------------------------------------------------------
  fastify.post("/institutions", async (request, reply) => {
    const result = createInstitutionSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: result.error.issues.map((i) => i.message).join(", ") });
    }

    const data = result.data;

    const existing = await prisma.institution.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existing) {
      return reply.code(409).send({ statusCode: 409, error: "Conflict", message: "An institution with this email already exists." });
    }

    const passwordHash = await hashPassword(data.password);

    const institution = await prisma.institution.create({
      data: {
        name:            data.name,
        countryCode:     data.countryCode,
        email:           data.email,
        passwordHash,
        onChainId:       data.onChainId,
        websiteUrl:      data.websiteUrl,
        logoUrl:         data.logoUrl,
        kycStatus:       "APPROVED",  // admin-created institutions are pre-approved
        subscriptionTier: "FREE",
        isActive:        true,
        slugId:          data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      },
      select: { id: true, name: true, email: true, kycStatus: true, subscriptionTier: true },
    });

    return reply.code(201).send(institution);
  });

  // -----------------------------------------------------------------------
  // PATCH /institutions/:id  — update any field
  // -----------------------------------------------------------------------
  fastify.patch("/institutions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result  = updateInstitutionAdminSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: result.error.issues.map((i) => i.message).join(", ") });
    }

    const updated = await prisma.institution.update({
      where: { id },
      data:  result.data,
    }).catch(() => null);

    if (!updated) {
      return reply.code(404).send({ statusCode: 404, error: "Not Found", message: "Institution not found." });
    }

    return reply.send(updated);
  });

  // -----------------------------------------------------------------------
  // PATCH /institutions/:id/deactivate  and  /reactivate
  // -----------------------------------------------------------------------
  fastify.patch("/institutions/:id/deactivate", async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.institution.update({ where: { id }, data: { isActive: false } });
    return reply.send({ message: "Institution deactivated." });
  });

  fastify.patch("/institutions/:id/reactivate", async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.institution.update({ where: { id }, data: { isActive: true } });
    return reply.send({ message: "Institution reactivated." });
  });

  // -----------------------------------------------------------------------
  // PATCH /employers/:id/kyc  — approve or reject employer KYC
  // -----------------------------------------------------------------------
  fastify.patch("/employers/:id/kyc", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result  = kycDecisionSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: result.error.issues.map((i) => i.message).join(", ") });
    }

    const { decision, notes } = result.data;
    const isActive = decision === "APPROVED";

    const employer = await prisma.employer.update({
      where: { id },
      data: {
        kycStatus: decision,
        isActive,
        kycNotes:  notes,
      },
      select: { id: true, companyName: true, kycStatus: true, isActive: true },
    }).catch(() => null);

    if (!employer) {
      return reply.code(404).send({ statusCode: 404, error: "Not Found", message: "Employer not found." });
    }

    return reply.send(employer);
  });

  // -----------------------------------------------------------------------
  // PATCH /employers/:id/upgrade-tier  — move employer to paid tier
  // -----------------------------------------------------------------------
  fastify.patch("/employers/:id/upgrade-tier", async (request, reply) => {
    const { id } = request.params as { id: string };

    const employer = await prisma.employer.update({
      where: { id },
      data:  { subscriptionTier: "PAID" },
      select: { id: true, companyName: true, subscriptionTier: true },
    }).catch(() => null);

    if (!employer) {
      return reply.code(404).send({ statusCode: 404, error: "Not Found", message: "Employer not found." });
    }

    return reply.send(employer);
  });

  // -----------------------------------------------------------------------
  // PATCH /employers/:id/deactivate
  // -----------------------------------------------------------------------
  fastify.patch("/employers/:id/deactivate", async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.employer.update({ where: { id }, data: { isActive: false } }).catch(() => null);
    return reply.send({ message: "Employer account deactivated." });
  });

  // -----------------------------------------------------------------------
  // GET /audit-logs  — paginated
  // -----------------------------------------------------------------------
  fastify.get("/audit-logs", async (request, reply) => {
    const query  = request.query as Record<string, string>;
    const page   = parseInt(query["page"] ?? "1", 10);
    const limit  = parseInt(query["limit"] ?? "50", 10);
    const skip   = (page - 1) * limit;
    const actor  = query["actorId"];
    const action = query["action"];

    const where: Prisma.AuditLogWhereInput = {
      ...(actor ? { actorIdHash: actor } : {}),
      ...(action ? { actionType: action } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take:    limit,
      }),
    ]);

    return reply.send({ total, page, limit, logs });
  });

  // -----------------------------------------------------------------------
  // GET /employers  — list all employers + KYC status (for review queue)
  // -----------------------------------------------------------------------
  fastify.get("/employers", async (request, reply) => {
    const query  = request.query as Record<string, string>;
    const status = query["kycStatus"];
    const page   = parseInt(query["page"] ?? "1", 10);
    const limit  = parseInt(query["limit"] ?? "20", 10);
    const skip   = (page - 1) * limit;

    const allowedStatus: KycStatus[] = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "FLAGGED"];
    const where: Prisma.EmployerWhereInput =
      status && allowedStatus.includes(status as KycStatus)
        ? { kycStatus: status as KycStatus }
        : {};

    const [total, employers] = await Promise.all([
      prisma.employer.count({ where }),
      prisma.employer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take:    limit,
        select: {
          id:              true,
          companyName:     true,
          contactEmail:    true,
          cacNumber:       true,
          kycStatus:       true,
          subscriptionTier: true,
          isActive:        true,
          createdAt:       true,
        },
      }),
    ]);

    return reply.send({ total, page, limit, employers });
  });
};
