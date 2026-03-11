import assert from "node:assert/strict";

function nowIso() {
  return new Date().toISOString();
}

function createInstitution() {
  return {
    id: "inst_001",
    name: "Demo University",
    kycStatus: "APPROVED",
    isActive: true,
    createdAt: nowIso(),
  };
}

function createClaimDefinition() {
  return {
    id: "claim_001",
    claimCode: "BSC_CS_FIRST_CLASS",
    claimLabel: "BSc Computer Science (First Class)",
    claimType: "AUTO",
    isActive: true,
    createdAt: nowIso(),
  };
}

function processBatch(records) {
  const result = records.map((record, index) => {
    const isValid = Boolean(record.matricNumber && record.studentName && Number.isFinite(record.cgpa));
    if (!isValid) {
      return {
        row: index + 1,
        status: "INVALID",
        error: "Missing required fields",
      };
    }
    return {
      row: index + 1,
      status: "VALID",
      credentialId: `cred_${index + 1}`,
      matricNumberHash: `hash_${record.matricNumber}`,
      claimCode: "BSC_CS_FIRST_CLASS",
    };
  });

  const passed = result.filter((row) => row.status === "VALID");
  const failed = result.filter((row) => row.status === "INVALID");

  return {
    id: "batch_001",
    statusTimeline: ["QUEUED", "PROCESSING", "SUBMITTING", "CONFIRMED"],
    recordCount: records.length,
    passedCount: passed.length,
    failedCount: failed.length,
    credentials: passed,
    errors: failed,
    confirmedAt: nowIso(),
  };
}

function simulateVerification(credentials, matricNumberHash) {
  const found = credentials.find((c) => c.matricNumberHash === matricNumberHash);
  if (!found) {
    return {
      status: "RECORD_NOT_FOUND",
      requestId: "vrf_not_found",
      resolvedAt: nowIso(),
    };
  }

  return {
    status: "COMPLETED",
    requestId: "vrf_ok",
    credentialId: found.credentialId,
    claimCode: found.claimCode,
    resolvedAt: nowIso(),
  };
}

function runSimulation() {
  const institution = createInstitution();
  const claim = createClaimDefinition();

  const sampleBatch = [
    { matricNumber: "CSC/2019/001", studentName: "Ada N.", cgpa: 4.8 },
    { matricNumber: "CSC/2019/002", studentName: "Bello T.", cgpa: 4.6 },
    { matricNumber: "", studentName: "Invalid Row", cgpa: 4.1 },
  ];

  const batch = processBatch(sampleBatch);

  const verificationOk = simulateVerification(batch.credentials, "hash_CSC/2019/001");
  const verificationMissing = simulateVerification(batch.credentials, "hash_UNKNOWN");

  const revokedCredentialId = batch.credentials[0]?.credentialId;

  assert.equal(institution.kycStatus, "APPROVED");
  assert.equal(institution.isActive, true);
  assert.equal(claim.isActive, true);

  assert.equal(batch.recordCount, 3);
  assert.equal(batch.passedCount, 2);
  assert.equal(batch.failedCount, 1);
  assert.deepEqual(batch.statusTimeline, ["QUEUED", "PROCESSING", "SUBMITTING", "CONFIRMED"]);

  assert.equal(verificationOk.status, "COMPLETED");
  assert.equal(verificationMissing.status, "RECORD_NOT_FOUND");
  assert.ok(revokedCredentialId);

  console.log("Workflow simulation passed");
  console.log(JSON.stringify({
    institution: institution.id,
    claim: claim.claimCode,
    batch: {
      id: batch.id,
      status: batch.statusTimeline.at(-1),
      recordCount: batch.recordCount,
      passedCount: batch.passedCount,
      failedCount: batch.failedCount,
    },
    verification: {
      completed: verificationOk.requestId,
      missing: verificationMissing.requestId,
    },
    revocation: {
      credentialId: revokedCredentialId,
      status: "REVOKED",
    },
  }, null, 2));
}

runSimulation();
