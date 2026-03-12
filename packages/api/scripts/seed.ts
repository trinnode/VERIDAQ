#!/usr/bin/env tsx
/**
 * scripts/seed.ts
 *
 * Bootstrap the database with a test institution and employer.
 * The platform admin is configured via environment variables
 * (ADMIN_EMAIL / ADMIN_PASSWORD) — no DB entry is needed.
 *
 * Usage:
 *   pnpm --filter @veridaq/api db:seed
 */

import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, buf) => {
      if (err) reject(err);
      else resolve(`${salt}:${buf.toString("hex")}`);
    });
  });
}

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Test Institution ──────────────────────────────────────────────────
  const institutionEmail = "demo@university.edu.ng";
  const institutionPassword = "DemoInstitution2026!";

  const existingInstitution = await prisma.institution.findUnique({
    where: { email: institutionEmail },
  });

  if (!existingInstitution) {
    const institution = await prisma.institution.create({
      data: {
        name: "Demo University",
        countryCode: "NG",
        email: institutionEmail,
        passwordHash: await hashPassword(institutionPassword),
        slugId: "demo-university",
        kycStatus: "APPROVED",
        subscriptionTier: "FREE",
        isActive: true,
      },
    });
    console.log(`✅ Institution created: ${institution.name}`);
    console.log(`   Email:    ${institutionEmail}`);
    console.log(`   Password: ${institutionPassword}\n`);
  } else {
    console.log(`⏭️  Institution already exists: ${existingInstitution.name}\n`);
  }

  // ── Test Employer ─────────────────────────────────────────────────────
  const employerEmail = "hr@democorp.com";
  const employerPassword = "DemoEmployer2026!";

  const existingEmployer = await prisma.employer.findFirst({
    where: { contactEmail: employerEmail },
  });

  if (!existingEmployer) {
    const employer = await prisma.employer.create({
      data: {
        companyName: "Demo Corp",
        contactEmail: employerEmail,
        passwordHash: await hashPassword(employerPassword),
        cacNumber: "RC-000001",
        contactName: "HR Manager",
        kycStatus: "APPROVED",
        subscriptionTier: "FREE",
        isActive: true,
      },
    });
    console.log(`✅ Employer created: ${employer.companyName}`);
    console.log(`   Email:    ${employerEmail}`);
    console.log(`   Password: ${employerPassword}\n`);
  } else {
    console.log(`⏭️  Employer already exists: ${existingEmployer.companyName}\n`);
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("──────────────────────────────────────────────────");
  console.log("Default Credentials");
  console.log("──────────────────────────────────────────────────");
  console.log("");
  console.log("Platform Admin (Console):");
  console.log("  Email:    admin@veridaq.com");
  console.log("  Password: VeriAdmin2026!");
  console.log("  (Configured via ADMIN_EMAIL / ADMIN_PASSWORD env vars)");
  console.log("");
  console.log("Institution (Portal):");
  console.log(`  Email:    ${institutionEmail}`);
  console.log(`  Password: ${institutionPassword}`);
  console.log("");
  console.log("Employer (Verify):");
  console.log(`  Email:    ${employerEmail}`);
  console.log(`  Password: ${employerPassword}`);
  console.log("──────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
