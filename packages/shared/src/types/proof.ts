import type { ClaimTypeCode, ClassificationCode } from "../constants/claim";

/**
 * What the backend sends to the proof service when
 * kicking off proof generation for a verification request.
 */
export interface ProofInput {
  studentName:    bigint;
  matricNumber:   bigint;
  cgpa:           bigint;
  classification: ClassificationCode;
  courseOfStudy:  bigint;
  graduationYear: number;
  blindingFactor: bigint;
  commitment:     bigint;
  nullifier:      bigint;
  institutionId:  bigint;
  claimType:      ClaimTypeCode;
  claimThreshold: bigint;
}

/**
 * The output of a successful Groth16 proof generation.
 * pA, pB, pC are the three Groth16 proof components.
 * publicSignals lists the public inputs in circuit declaration order:
 *   [commitment, nullifier, institutionId, claimType, claimThreshold]
 */
export interface ProofOutput {
  pA:            [string, string];
  pB:            [[string, string], [string, string]];
  pC:            [string, string];
  publicSignals: string[];
}

/**
 * Stored in the VerificationRequest table as 'resultProof' when the request
 * is complete. We store enough to let anyone re-verify the proof later.
 */
export interface StoredProofRecord {
  proof:          ProofOutput;
  verifiedAt:     string;    // ISO timestamp
  onChainTxHash:  string;    // the tx that called ZKVerifier.verifyProof
  blockNumber:    number;
}
