/**
 * db.ts
 *
 * Singleton Prisma client.  In dev, hot-reloads keep spawning new module
 * instances, which would flood the DB with connections.  The globalThis
 * cache pattern prevents that.
 *
 * Prisma 7 uses a driver-adapter model.  For standard Node.js with postgres
 * we use @prisma/adapter-pg which wraps the classic `pg` connection pool.
 * The schema.prisma file no longer holds the connection URL — we pass it
 * here explicitly so it's validated by our env.ts before any query runs.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const datasourceUrl = process.env.DATABASE_URL;
if (!datasourceUrl) {
  throw new Error(
    "DATABASE_URL is not set.  Copy .env.example to .env and fill it in."
  );
}

const globalWithPrisma = global as typeof global & {
  __prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: datasourceUrl as string });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });
}

export const prisma: PrismaClient =
  globalWithPrisma.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalWithPrisma.__prisma = prisma;
}


