/**
 * env.ts
 *
 * Load and validate environment variables once at startup.
 * We use zod here instead of a separate library so we fail fast
 * with a clear message if something is missing.
 */

import { z } from "zod";
import { config } from "dotenv";

config();  // load .env file if it exists

const schema = z.object({
  NODE_ENV:        z.enum(["development", "test", "production"]).default("development"),
  PORT:            z.coerce.number().default(3001),
  LOG_LEVEL:       z.string().default("info"),
  CORS_ORIGIN:     z.string().default("http://localhost:3000,http://localhost:3002,http://localhost:3003"),

  DATABASE_URL:    z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL:       z.string().default("redis://localhost:6379"),

  JWT_SECRET:      z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_EXPIRES_IN:  z.string().default("7d"),

  // file storage — S3 or local depending on NODE_ENV
  STORAGE_DRIVER:  z.enum(["s3", "local"]).default("local"),
  S3_BUCKET:       z.string().optional(),
  S3_REGION:       z.string().optional(),
  AWS_ACCESS_KEY:  z.string().optional(),
  AWS_SECRET_KEY:  z.string().optional(),
  LOCAL_STORAGE_DIR: z.string().default("./uploads"),

  // ZKP circuit artifacts
  CIRCUIT_WASM_PATH:    z.string().min(1, "CIRCUIT_WASM_PATH is required"),
  CIRCUIT_ZKEY_PATH:    z.string().min(1, "CIRCUIT_ZKEY_PATH is required"),
  VERIFICATION_KEY_PATH: z.string().min(1, "VERIFICATION_KEY_PATH is required"),

  // blockchain
  RPC_URL:              z.string().default("http://localhost:8545"),
  BUNDLER_PRIVATE_KEY:  z.string().optional(),
  INSTITUTION_REGISTRY_ADDRESS: z.string().optional(),
  CREDENTIAL_REGISTRY_ADDRESS:  z.string().optional(),
  REVOCATION_REGISTRY_ADDRESS:  z.string().optional(),
  PAYMASTER_VAULT_ADDRESS:      z.string().optional(),
  SUBSCRIPTION_MANAGER_ADDRESS: z.string().optional(),

  // email
  SMTP_HOST:      z.string().optional(),
  SMTP_PORT:      z.coerce.number().default(587),
  SMTP_USER:      z.string().optional(),
  SMTP_PASS:      z.string().optional(),
  EMAIL_FROM:     z.string().default("noreply@veridaq.ng"),

  // IPFS / Pinata (for storing encrypted private data)
  PINATA_API_KEY:    z.string().optional(),
  PINATA_SECRET_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Environment variable validation failed:\n${issues}`);
}

export const env = parsed.data;
