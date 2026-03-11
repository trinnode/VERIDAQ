// prisma.config.ts
//
// Prisma 7 requires connection details to live here instead of schema.prisma.
// The CLI (prisma generate / migrate) reads this file automatically when it
// is placed in the package root alongside package.json.
//
// dotenv/config is imported so the CLI picks up DATABASE_URL from .env even
// when invoked directly (not through our src/env.ts startup code).

import { defineConfig } from "@prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill it in."
  );
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrate: {
    adapter: () => new PrismaPg(connectionString),
  },
});
