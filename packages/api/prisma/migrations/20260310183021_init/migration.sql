-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "InstitutionTier" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "EmployerTier" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('QUEUED', 'VALIDATING', 'VALIDATION_FAILED', 'PROCESSING', 'SUBMITTING_TO_CHAIN', 'AWAITING_CONFIRMATION', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'AUTO_PROCESSING', 'AWAITING_INSTITUTION', 'COMPLETED', 'DECLINED', 'RECORD_NOT_FOUND', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('INSTITUTION', 'EMPLOYER', 'PLATFORM_ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'PARTIAL');

-- CreateEnum
CREATE TYPE "SessionActorType" AS ENUM ('INSTITUTION', 'EMPLOYER', 'PLATFORM_ADMIN');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "slugId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'NG',
    "adminWalletAddress" TEXT,
    "publicSigningKey" TEXT,
    "onChainId" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "kycDocumentUrls" TEXT[],
    "subscriptionTier" "InstitutionTier" NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT NOT NULL,
    "contactPhone" TEXT,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "addressLine" TEXT,
    "state" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employer" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "cacNumber" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactNin" TEXT,
    "contactEmail" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "addressLine" TEXT,
    "state" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "kycNotes" TEXT,
    "kycDocumentUrls" TEXT[],
    "subscriptionTier" "EmployerTier" NOT NULL DEFAULT 'FREE',
    "freeVerificationsUsed" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialBatch" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "uploadedByEmail" TEXT NOT NULL DEFAULT '',
    "storagePath" TEXT NOT NULL,
    "fileHash" TEXT,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "onChainTxHash" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'QUEUED',
    "errorReport" JSONB,
    "gasUsed" TEXT,
    "wasSponsoredGas" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "CredentialBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "batchId" TEXT,
    "nullifier" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "matricNumberHash" TEXT NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "degreeTypeCode" INTEGER NOT NULL,
    "encryptedPrivateData" TEXT NOT NULL DEFAULT '',
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimDefinition" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "claimCode" TEXT NOT NULL,
    "claimLabel" TEXT NOT NULL,
    "claimType" "ClaimType" NOT NULL DEFAULT 'AUTO',
    "claimTypeCode" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "matricNumberHash" TEXT NOT NULL,
    "claimCode" TEXT NOT NULL,
    "claimTypeCode" INTEGER NOT NULL,
    "claimThreshold" INTEGER NOT NULL DEFAULT 0,
    "customClaimText" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "resultProof" JSONB,
    "declineReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorIdHash" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "outcome" "AuditOutcome" NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" "SessionActorType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_slugId_key" ON "Institution"("slugId");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_adminWalletAddress_key" ON "Institution"("adminWalletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_email_key" ON "Institution"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employer_cacNumber_key" ON "Employer"("cacNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Employer_contactNin_key" ON "Employer"("contactNin");

-- CreateIndex
CREATE UNIQUE INDEX "Employer_contactEmail_key" ON "Employer"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_nullifier_key" ON "Credential"("nullifier");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_commitment_key" ON "Credential"("commitment");

-- CreateIndex
CREATE INDEX "Credential_institutionId_idx" ON "Credential"("institutionId");

-- CreateIndex
CREATE INDEX "Credential_matricNumberHash_institutionId_idx" ON "Credential"("matricNumberHash", "institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimDefinition_institutionId_claimCode_key" ON "ClaimDefinition"("institutionId", "claimCode");

-- CreateIndex
CREATE INDEX "VerificationRequest_employerId_idx" ON "VerificationRequest"("employerId");

-- CreateIndex
CREATE INDEX "VerificationRequest_institutionId_idx" ON "VerificationRequest"("institutionId");

-- CreateIndex
CREATE INDEX "VerificationRequest_matricNumberHash_institutionId_idx" ON "VerificationRequest"("matricNumberHash", "institutionId");

-- CreateIndex
CREATE INDEX "AuditLog_actorIdHash_idx" ON "AuditLog"("actorIdHash");

-- CreateIndex
CREATE INDEX "AuditLog_resourceId_idx" ON "AuditLog"("resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_actorId_idx" ON "Session"("actorId");

-- AddForeignKey
ALTER TABLE "CredentialBatch" ADD CONSTRAINT "CredentialBatch_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CredentialBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimDefinition" ADD CONSTRAINT "ClaimDefinition_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
