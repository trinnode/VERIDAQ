/**
 * jobs/queue.ts
 *
 * Creates and exports the BullMQ queues used by the API.
 * The worker (jobs/worker.ts) reads from these same queues.
 *
 * We keep both queue declarations here so the queue name strings
 * only exist in one place.
 */

import { Queue } from "bullmq";
import { env }  from "../env.js";

// Connection config shared by all queues
const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || "6379", 10),
};

let batchQueue: Queue | null = null;

// Batch credential processing queue
// Jobs: { batchId: string, institutionId: string }
export function getBatchQueue() {
  if (env.DISABLE_QUEUE) {
    throw new Error("Queue processing is disabled by DISABLE_QUEUE=true");
  }

  if (!batchQueue) {
    batchQueue = new Queue("credential-batch", {
      connection,
      defaultJobOptions: {
        attempts:    3,
        backoff:     { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail:     { count: 200 },
      },
    });
  }

  return batchQueue;
}
