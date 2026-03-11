/**
 * services/verificationService.ts
 *
 * Orchestrates a single verification request end to end:
 *   1. Look up the credential by nullifier in our DB
 *   2. Check it isn't revoked (DB flag — the on-chain check is done in the worker)
 *   3. Check this employer still has budget (free tier limit)
 *   4. Verify the ZK proof (off-chain, via snarkjs)
 *   5. Persist the VerificationRequest with outcome
 *   6. Return a simple { valid, reason } response to the route handler
 *
 * This is intentionally synchronous from the API's perspective.
 * The proof verification step is fast (< 10ms for Groth16 verify).
 * We don't need a job queue here — only the batch registration pipeline
 * uses the queue.
 */

import { prisma } from "../db.js";
import { verifyProof, type Proof } from "./proofService.js";
import type { Prisma } from "@prisma/client";

// Claim type codes — must match CLAIM_TYPES in @veridaq/shared and the circuit
const CLAIM_TYPE_CODES: Record<string, number> = {
  GRADUATED:        1,
  MIN_UPPER_SECOND: 2,
  MIN_LOWER_SECOND: 3,
  FIRST_CLASS:      4,
  CGPA_THRESHOLD:   5,
  CUSTOM:           99,
};

const FREE_TIER_LIMIT = 3;  // must match SubscriptionManager.sol constant

interface RunInput {
  employerId:    string;
  nullifier:     string;
  claimType:     "GRADUATED" | "MIN_UPPER_SECOND" | "MIN_LOWER_SECOND" | "FIRST_CLASS" | "CGPA_THRESHOLD" | "CUSTOM";
  proof:         Proof;
  publicSignals: string[];
}

interface RunResult {
  valid:       boolean;
  reason?:     string;
  requestId?:  string;
}

export const verificationService = {
  async run(input: RunInput): Promise<RunResult> {
    const { employerId, nullifier, claimType, proof, publicSignals } = input;
    const claimTypeCode = CLAIM_TYPE_CODES[claimType] ?? 0;

    // ── Step 1: Look up the credential ─────────────────────────────────────
    const credential = await prisma.credential.findUnique({
      where:  { nullifier },
      select: {
        id:            true,
        institutionId: true,
        commitment:    true,
        isRevoked:     true,
        issuedAt:      true,
      },
    });

    if (!credential) {
      return { valid: false, reason: "No credential found with this nullifier." };
    }

    if (credential.isRevoked) {
      return { valid: false, reason: "This credential has been revoked." };
    }

    // ── Step 3: Employer budget check ──────────────────────────────────────
    const employer = await prisma.employer.findUnique({
      where:  { id: employerId },
      select: { freeVerificationsUsed: true, subscriptionTier: true },
    });

    if (!employer) {
      return { valid: false, reason: "Employer account not found." };
    }

    const isFree    = employer.subscriptionTier === "FREE";
    const overLimit = isFree && employer.freeVerificationsUsed >= FREE_TIER_LIMIT;

    if (overLimit) {
      return {
        valid:  false,
        reason: `Free tier limit of ${FREE_TIER_LIMIT} verifications reached. Please upgrade to continue.`,
      };
    }

    // ── Step 4: ZK proof verification ──────────────────────────────────────
    const proofResult = await verifyProof({
      proof,
      publicSignals,
      claimTypeCode,
      nullifier,
    });

    // ── Step 5: Persist the VerificationRequest ─────────────────────────────
    const status = proofResult.valid ? "COMPLETED" : "DECLINED";

    const record = await prisma.verificationRequest.create({
      data: {
        employerId,
        institutionId:   credential.institutionId,
        matricNumberHash: "", // employer flow doesn't pass matric number — nullifier is enough
        claimCode:       claimType,
        claimTypeCode,
        status,
        resultProof:     proofResult.valid
          ? ({ proof, publicSignals } as unknown as Prisma.InputJsonValue)
          : undefined,
        declineReason:   proofResult.reason,
        resolvedAt:      new Date(),
      },
      select: { id: true },
    });

    // ── Step 6: Increment usage counter for free tier employers ────────────
    if (proofResult.valid) {
      await prisma.employer.update({
        where: { id: employerId },
        data:  { freeVerificationsUsed: { increment: 1 } },
      });
    }

    return {
      valid:     proofResult.valid,
      reason:    proofResult.reason,
      requestId: record.id,
    };
  },
};
