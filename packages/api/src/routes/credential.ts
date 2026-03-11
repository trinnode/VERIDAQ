/**
 * routes/credential.ts
 *
 * Endpoints for checking credential existence.  
 * These are read-only — writing credentials happens through the batch pipeline.
 *
 *   GET /v1/credentials/:nullifier  
 *     — checks if a credential with that nullifier exists and isn't revoked.
 *       Used by the employer-facing "verification" flow to confirm the
 *       on-chain state before generating a proof request.
 *       Publicly accessible (no auth needed) because the nullifier itself
 *       is already a one-way hash; knowing it exists reveals nothing about
 *       the student.
 *
 *   GET /v1/credentials/claim-types
 *     — returns the list of supported claim definitions so the portal can
 *       build a dropdown without hardcoding anything.
 */

import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";

export const credentialRoutes: FastifyPluginAsync = async (fastify) => {
  // -----------------------------------------------------------------------
  // GET /claim-types  — public, no auth needed
  // -----------------------------------------------------------------------
  fastify.get("/claim-types", async (_request, reply) => {
    const claimTypes = await prisma.claimDefinition.findMany({
      where:   { isActive: true },
      orderBy: { claimType: "asc" },
    });
    return reply.send(claimTypes);
  });

  // -----------------------------------------------------------------------
  // GET /:nullifier  — check if a credential exists and is not revoked
  // -----------------------------------------------------------------------
  fastify.get("/:nullifier", async (request, reply) => {
    const { nullifier } = request.params as { nullifier: string };

    if (!nullifier || nullifier.length < 10) {
      return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: "Invalid nullifier." });
    }

    const credential = await prisma.credential.findUnique({
      where:  { nullifier },
      select: {
        id:             true,
        nullifier:      true,
        graduationYear: true,
        degreeTypeCode: true,
        isRevoked:      true,
        revokedAt:      true,
        institution: {
          select: { id: true, name: true, countryCode: true },
        },
      },
    });

    if (!credential) {
      return reply.code(404).send({
        statusCode: 404,
        error:   "Not Found",
        message: "No credential found with this nullifier.",
      });
    }

    if (credential.isRevoked) {
      return reply.code(410).send({
        statusCode: 410,
        error:   "Gone",
        message: "This credential has been revoked.",
        revokedAt: credential.revokedAt,
      });
    }

    return reply.send({
      exists:         true,
      nullifier:      credential.nullifier,
      graduationYear: credential.graduationYear,
      degreeTypeCode: credential.degreeTypeCode,
      isRevoked:      false,
      institution: {
        id:          credential.institution.id,
        name:        credential.institution.name,
        countryCode: credential.institution.countryCode,
      },
    });
  });
};
