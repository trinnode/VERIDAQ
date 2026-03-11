/**
 * Claim type codes. These must match what is hardcoded in the Circom circuit.
 * When you add a new code here, the circuit needs a matching branch too.
 */
export const CLAIM_TYPES = {
  GRADUATED:          1,
  MIN_UPPER_SECOND:   2,
  MIN_LOWER_SECOND:   3,
  FIRST_CLASS:        4,
  CGPA_THRESHOLD:     5,
  CUSTOM:             99,
} as const;

export type ClaimTypeCode = typeof CLAIM_TYPES[keyof typeof CLAIM_TYPES];

/**
 * Classification codes. These are stored in the circuit as integers.
 * They correspond to the UK-style classification used in Nigerian universities.
 */
export const CLASSIFICATION_CODES = {
  THIRD_CLASS:   1,
  LOWER_SECOND:  2,
  UPPER_SECOND:  3,
  FIRST_CLASS:   4,
} as const;

export type ClassificationCode = typeof CLASSIFICATION_CODES[keyof typeof CLASSIFICATION_CODES];

/**
 * Human-readable labels for claim types, used in the UI and API responses.
 * Keys match CLAIM_TYPES values.
 */
export const CLAIM_TYPE_LABELS: Record<ClaimTypeCode, string> = {
  [CLAIM_TYPES.GRADUATED]:        "Graduated",
  [CLAIM_TYPES.MIN_UPPER_SECOND]: "Minimum Upper Second Class",
  [CLAIM_TYPES.MIN_LOWER_SECOND]: "Minimum Lower Second Class",
  [CLAIM_TYPES.FIRST_CLASS]:      "First Class",
  [CLAIM_TYPES.CGPA_THRESHOLD]:   "CGPA Above Threshold",
  [CLAIM_TYPES.CUSTOM]:           "Custom Claim",
};

/**
 * How CGPA is stored: actual CGPA * 100.
 * So a 3.50 CGPA is stored as 350. Max is 5.00 so max stored is 500.
 */
export const CGPA_SCALE_FACTOR = 100;
export const CGPA_MAX_SCALED   = 500;

/**
 * Batch size threshold for the institution free tier. Under this number the
 * platform sponsors gas. At or above this number the institution pays.
 */
export const FREE_TIER_BATCH_GAS_THRESHOLD = 1000;

/**
 * How many free verifications an employer gets for their lifetime. Never resets.
 */
export const EMPLOYER_FREE_VERIFICATIONS = 3;
