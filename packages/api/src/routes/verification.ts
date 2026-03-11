/**
 * routes/verification.ts
 *
 * The verification flow is the core of the whole system.
 * An employer submits a request with:
 *   - the nullifier they got from the candidate
 *   - the type of claim they want to verify (e.g. "degree holder", "CGPA ≥ 3.5")
 *   - the proof and public signals the candidate generated client-side
 *
 * We verify the proof on our side (off-chain) using snarkjs and also check
 * the nullifier against the on-chain RevocationRegistry.  No personal data
 * leaves the system.
 *
 *   POST /v1/verifications      — submit a verification request
 *   GET  /v1/verifications/:id  — poll the result
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireRole } from "../middleware/requireRole.js";
import { verificationService } from "../services/verificationService.js";

const submitVerificationSchema = z.object({
  nullifier:     z.string().min(10),
  claimType:     z.enum(["GRADUATED", "MIN_UPPER_SECOND", "MIN_LOWER_SECOND", "FIRST_CLASS", "CGPA_THRESHOLD", "CUSTOM"]),
  // Groth16 proof from snarkjs — serializable as plain objects
  proof: z.object({
    pi_a: z.array(z.string()).length(3),
    pi_b: z.array(z.array(z.string()).length(2)).length(3),
    pi_c: z.array(z.string()).length(3),
    protocol: z.string(),
    curve:    z.string(),
  }),
  publicSignals: z.array(z.string()),
});

export const verificationRoutes: FastifyPluginAsync = async (fastify) => {
  // All verification routes require auth
  fastify.addHook("onRequest", fastify.authenticate);
  fastify.addHook("preHandler", requireRole("EMPLOYER"));

  // -----------------------------------------------------------------------
  // POST /  — kick off a verification
  // -----------------------------------------------------------------------
  fastify.post("/", async (request, reply) => {
    const user   = request.user as { sub: string };
    const result = submitVerificationSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: result.error.issues.map((i) => i.message).join(", ") });
    }

    // Make sure this employer account is approved + active
    const employer = await prisma.employer.findUnique({
      where:  { id: user.sub },
      select: { isActive: true, kycStatus: true },
    });

    if (!employer?.isActive || employer.kycStatus !== "APPROVED") {
      return reply.code(403).send({
        statusCode: 403,
        error:   "Forbidden",
        message: "Your account must be KYC-approved before running verifications.",
      });
    }

    const { nullifier, claimType, proof, publicSignals } = result.data;

    // verificationService handles:
    //  1. ZKP proof verification (off-chain, via snarkjs)
    //  2. Nullifier existence + revocation check (DB + optionally on-chain)
    //  3. Incrementing the employer's usage counter
    //  4. Persisting the VerificationRequest with outcome
    const verificationResult = await verificationService.run({
      employerId: user.sub,
      nullifier,
      claimType,
      proof,
      publicSignals,
    });

    const statusCode = verificationResult.valid ? 200 : 422;
    return reply.code(statusCode).send(verificationResult);
  });

  // -----------------------------------------------------------------------
  // GET /:id  — look up a verification result by ID
  // -----------------------------------------------------------------------
  fastify.get("/:id", async (request, reply) => {
    const user   = request.user as { sub: string };
    const params = request.params as { id: string };

    const record = await prisma.verificationRequest.findFirst({
      where: { id: params.id, employerId: user.sub },
    });

    if (!record) {
      return reply.code(404).send({ statusCode: 404, error: "Not Found", message: "Verification record not found." });
    }

    return reply.send(record);
  });
};
