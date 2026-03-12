/**
 * routes/institution.ts
 *
 * All the things an institution admin can do through the portal:
 *   GET    /v1/institutions/me          — own profile
 *   PATCH  /v1/institutions/me          — update contact details
 *   GET    /v1/institutions/me/batches  — list credential batches
 *   POST   /v1/institutions/me/batches  — upload an Excel file, kick off batch job
 *   GET    /v1/institutions/me/batches/:batchId  — batch status + error report
 *
 * Admin-only routes (role=ADMIN) in admin.ts handle creating/deactivating institutions.
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireRole } from "../middleware/requireRole.js";
import { getBatchQueue } from "../jobs/queue.js";
import { env } from "../env.js";

const updateInstitutionSchema = z.object({
  contactPhone:    z.string().optional(),
  websiteUrl:      z.string().url().optional(),
  logoUrl:         z.string().url().optional(),
  addressLine:     z.string().optional(),
  state:           z.string().optional(),
});

export const institutionRoutes: FastifyPluginAsync = async (fastify) => {
  // All institution routes require JWT + INSTITUTION role
  fastify.addHook("onRequest", fastify.authenticate);
  fastify.addHook("preHandler", requireRole("INSTITUTION"));

  // -----------------------------------------------------------------------
  // GET /me  — own institution profile
  // -----------------------------------------------------------------------
  fastify.get("/me", async (request, reply) => {
    const user = request.user as { sub: string };
    const institution = await prisma.institution.findUnique({
      where: { id: user.sub },
      select: {
        id:              true,
        name:            true,
        countryCode:     true,
        email:           true,
        contactPhone:    true,
        websiteUrl:      true,
        logoUrl:         true,
        subscriptionTier: true,
        kycStatus:       true,
        isActive:        true,
        createdAt:       true,
      },
    });

    if (!institution) {
      return reply.code(404).send({ statusCode: 404, error: "Not Found", message: "Institution not found." });
    }

    return reply.send(institution);
  });

  // -----------------------------------------------------------------------
  // PATCH /me  — update non-sensitive fields
  // -----------------------------------------------------------------------
  fastify.patch("/me", async (request, reply) => {
    const user = request.user as { sub: string };
    const result = updateInstitutionSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: result.error.issues.map((i) => i.message).join(", ") });
    }

    const updated = await prisma.institution.update({
      where: { id: user.sub },
      data:  result.data,
      select: { id: true, name: true, email: true, contactPhone: true, websiteUrl: true },
    });

    return reply.send(updated);
  });

  // -----------------------------------------------------------------------
  // GET /me/batches  — list all batches for this institution
  // -----------------------------------------------------------------------
  fastify.get("/me/batches", async (request, reply) => {
    const user  = request.user as { sub: string };
    const query = (request.query as Record<string, string>);
    const page  = parseInt(query["page"] ?? "1", 10);
    const limit = parseInt(query["limit"] ?? "20", 10);
    const skip  = (page - 1) * limit;

    const [total, batches] = await Promise.all([
      prisma.credentialBatch.count({ where: { institutionId: user.sub } }),
      prisma.credentialBatch.findMany({
        where:   { institutionId: user.sub },
        orderBy: { createdAt: "desc" },
        skip,
        take:    limit,
        select: {
          id:              true,
          status:          true,
          recordCount:     true,
          passedCount:     true,
          failedCount:     true,
          createdAt:       true,
          confirmedAt:     true,
        },
      }),
    ]);

    return reply.send({ total, page, limit, batches });
  });

  // -----------------------------------------------------------------------
  // POST /me/batches  — upload Excel, create a batch job
  // -----------------------------------------------------------------------
  fastify.post("/me/batches", async (request, reply) => {
    const user = request.user as { sub: string };

    if (env.DISABLE_QUEUE) {
      return reply.code(503).send({
        statusCode: 503,
        error: "Service Unavailable",
        message: "Batch processing is disabled on this deployment. Please use a deployment with a running worker.",
      });
    }

    // First confirm institution is active + KYC approved
    const institution = await prisma.institution.findUnique({
      where:  { id: user.sub },
      select: { isActive: true, kycStatus: true },
    });

    if (!institution?.isActive) {
      return reply.code(403).send({ statusCode: 403, error: "Forbidden", message: "Institution account is not active." });
    }

    if (institution.kycStatus !== "APPROVED") {
      return reply.code(403).send({ statusCode: 403, error: "Forbidden", message: "KYC approval is required before uploading credentials." });
    }

    // Get the multipart file
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: "No file uploaded." });
    }

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: "File must be an Excel spreadsheet (.xlsx or .xls)." });
    }

    // Read file into a buffer (we store it locally or to S3 in the worker)
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);
    const fileName   = `${user.sub}/${Date.now()}-${data.filename}`;

    // Write the buffer to local storage for now — the worker will pick it up
    const { writeFileToStorage } = await import("../utils/storage.js");
    await writeFileToStorage(fileName, fileBuffer);

    // Create the DB record — status starts as QUEUED
    const batch = await prisma.credentialBatch.create({
      data: {
        institutionId: user.sub,
        storagePath:   fileName,
        status:        "QUEUED",
        recordCount:   0,  // updated by the worker once it parses the file
      },
    });

    // Push a job into the queue
    try {
      const batchQueue = getBatchQueue();
      await batchQueue.add("process-batch", { batchId: batch.id, institutionId: user.sub });
    } catch {
      return reply.code(503).send({
        statusCode: 503,
        error: "Service Unavailable",
        message: "Batch queue is currently unavailable. Ensure Redis is running and try again.",
      });
    }

    return reply.code(202).send({
      batchId: batch.id,
      status:  "PENDING",
      message: "Batch accepted. Processing will begin shortly.",
    });
  });

  // -----------------------------------------------------------------------
  // GET /me/batches/:batchId  — details including error report
  // -----------------------------------------------------------------------
  fastify.get("/me/batches/:batchId", async (request, reply) => {
    const user    = request.user as { sub: string };
    const params  = request.params as { batchId: string };

    const batch = await prisma.credentialBatch.findFirst({
      where: { id: params.batchId, institutionId: user.sub },
    });

    if (!batch) {
      return reply.code(404).send({ statusCode: 404, error: "Not Found", message: "Batch not found." });
    }

    return reply.send(batch);
  });
};
