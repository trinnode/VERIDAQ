/**
 * services/proofService.ts
 *
 * Thin wrapper around snarkjs groth16.verify.
 * The actual proof is generated CLIENT-SIDE in the browser/mobile app.
 * Here we just verify that the proof the employer submitted is valid
 * against our verification key.
 *
 * We also check that the public signals match the claim the employer
 * is asserting — otherwise someone could submit a valid proof for claim X
 * and claim it proves Y.
 */

import fs from "node:fs/promises";
import { env } from "../env.js";

// snarkjs is a CommonJS module so we need a dynamic import
let _snarkjs: Record<string, unknown> | null = null;
async function snarkjs() {
  if (!_snarkjs) {
    _snarkjs = await import("snarkjs") as Record<string, unknown>;
  }
  return _snarkjs;
}

// Cache the verification key in memory after first load
let _vkey: Record<string, unknown> | null = null;
async function getVKey() {
  if (!_vkey) {
    const raw  = await fs.readFile(env.VERIFICATION_KEY_PATH, "utf-8");
    _vkey      = JSON.parse(raw);
  }
  return _vkey!;
}

// The public circuit inputs for a valid fresh proof, in order:
// [0]  isValid        — must be "1"
// [1]  claimType      — encoded claim type (see @veridaq/shared CLAIM_TYPES)
// [2]  claimThreshold — e.g. 350 for "CGPA >= 3.5", 0 if not applicable
// [3]  nullifier      — matches the nullifier in our DB
// [4]  commitment     — matches the commitment stored on chain

export interface Proof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export interface VerifyInput {
  proof:         Proof;
  publicSignals: string[];
  claimTypeCode: number;
  nullifier:     string;
}

export interface VerifyResult {
  valid:        boolean;
  reason?:      string;
}

export async function verifyProof(input: VerifyInput): Promise<VerifyResult> {
  const { groth16 } = (await snarkjs()) as { groth16: { verify: (vk: unknown, pub: string[], proof: Proof) => Promise<boolean> } };
  const vkey = await getVKey();

  // Verify the cryptographic proof first
  let proofValid: boolean;
  try {
    proofValid = await groth16.verify(vkey, input.publicSignals, input.proof);
  } catch {
    return { valid: false, reason: "proof verification threw an error — malformed proof" };
  }

  if (!proofValid) {
    return { valid: false, reason: "proof is cryptographically invalid" };
  }

  // Check the public signals match the claim we're trying to verify
  // publicSignals[0] = isValid flag
  if (input.publicSignals[0] !== "1") {
    return { valid: false, reason: "circuit output isValid is not 1" };
  }

  // publicSignals[1] = claimType
  if (input.publicSignals[1] !== String(input.claimTypeCode)) {
    return {
      valid: false,
      reason: `proof is for claim type ${input.publicSignals[1]}, not ${input.claimTypeCode}`,
    };
  }

  // publicSignals[3] = nullifier field element — compare as strings
  // (both will be decimal field element representations from snarkjs)
  const expectedNullifier = input.nullifier.startsWith("0x")
    ? BigInt(input.nullifier).toString()
    : input.nullifier;

  if (input.publicSignals[3] !== expectedNullifier) {
    return { valid: false, reason: "nullifier in proof does not match the submitted nullifier" };
  }

  return { valid: true };
}
