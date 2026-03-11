/**
 * jobs/worker.ts
 *
 * BullMQ worker that processes the credential-batch queue.
 * Run this as a separate process: `pnpm worker`
 *
 * Each job contains: { batchId, institutionId }
 * The worker:
 *   1. Updates batch status to PROCESSING
 *   2. Reads the Excel file from storage
 *   3. Validates rows, computes commitments + nullifiers
 *   4. Saves credentials to DB
 *   5. Updates batch status to CONFIRMED (or FAILED with error report)
 *   6. Sends an email notification to the institution
 *
 * On failure the job retries up to 3 times with exponential backoff.
 */

import { Worker, type Job } from "bullmq";
import { createTransport }  from "nodemailer";
import { prisma }  from "../db.js";
import { env }     from "../env.js";
import { processBatch } from "../services/batchService.js";

// ─── Email helper ─────────────────────────────────────────────────────────

function buildMailer() {
  if (!env.SMTP_HOST) return null;  // email disabled if no SMTP config

  return createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
}

const mailer = buildMailer();

async function sendBatchNotification(
  institutionEmail: string,
  batchId:          string,
  processed:        number,
  failed:           number,
): Promise<void> {
  if (!mailer) return;

  const subject = failed > 0
    ? `[VERIDAQ] Batch upload partially failed — ${failed} errors`
    : `[VERIDAQ] Batch upload complete — ${processed} credentials registered`;

  const text = failed > 0
    ? `Your batch (ID: ${batchId}) completed with errors.\n\nProcessed: ${processed}\nFailed: ${failed}\n\nPlease log in to the portal to see the error report.`
    : `Your batch (ID: ${batchId}) was processed successfully.\n\n${processed} credentials have been registered.`;

  await mailer.sendMail({ from: env.EMAIL_FROM, to: institutionEmail, subject, text });
}

// ─── Job processor ────────────────────────────────────────────────────────

async function handleBatchJob(job: Job<{ batchId: string; institutionId: string }>) {
  const { batchId, institutionId } = job.data;

  job.log(`Starting batch ${batchId} for institution ${institutionId}`);

  let institutionEmail: string | null = null;

  try {
    // Get institution email so we can notify them
    const institution = await prisma.institution.findUnique({
      where:  { id: institutionId },
      select: { email: true },
    });
    institutionEmail = institution?.email ?? null;

    const result = await processBatch(batchId, institutionId);

    job.log(`Batch ${batchId} done: ${result.processed} processed, ${result.failed} failed`);

    if (institutionEmail) {
      await sendBatchNotification(institutionEmail, batchId, result.processed, result.failed);
    }
  } catch (err) {
    job.log(`Batch ${batchId} threw an error: ${String(err)}`);

    // Mark the batch as failed in DB so the institution sees it
    await prisma.credentialBatch.update({
      where: { id: batchId },
      data:  {
        status:      "FAILED",
        errorReport: [{ row: 0, errors: [`Worker error: ${String(err)}`] }],
      },
    }).catch(() => {});  // don't throw if the update fails too

    throw err;  // rethrow so BullMQ knows the job failed and can retry
  }
}

// ─── Boot the worker ──────────────────────────────────────────────────────

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || "6379", 10),
};

const worker = new Worker("credential-batch", handleBatchJob, {
  connection,
  concurrency: 2,  // process 2 batches at the same time
});

worker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[worker] worker error:", err);
});

console.log("[worker] credential-batch worker started");

// Graceful shutdown
const stop = async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", stop);
process.on("SIGINT",  stop);
