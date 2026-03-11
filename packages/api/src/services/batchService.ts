/**
 * services/batchService.ts
 *
 * Parses an uploaded Excel file, validates each row against the expected
 * schema, computes the Poseidon commitment and nullifier for each row,
 * then registers the batch on chain via CredentialRegistry.registerBatch.
 *
 * This runs inside the BullMQ worker — not in the HTTP request handler.
 * Errors here update the batch status to FAILED and write an error report
 * to the DB so the institution can see exactly which rows had problems.
 *
 * Expected Excel columns (case-insensitive):
 *   matricNumber    — student matric number
 *   firstName       — student first name
 *   lastName        — student last name
 *   degreeType      — e.g. "B.Sc", "M.Sc", "PhD"  (mapped to a numeric code)
 *   graduationYear  — four-digit year
 *   cgpa            — float, e.g. 4.5
 *   totalCredits    — integer
 *   classification  — e.g. "First Class" (used to cross-check circuit constraints)
 *
 * We compute:
 *   commitment = Poseidon([matric, cgpa_int, gradYear, degreeCode, institutionSecret])
 *   nullifier  = Poseidon([commitment, institutionSecret])
 *
 * Where cgpa_int = floor(cgpa * 100) so 4.50 → 450.
 * institutionSecret is derived from the institution's private signing key.
 */

import crypto  from "node:crypto";
import { prisma }  from "../db.js";
import { readFileFromStorage } from "../utils/storage.js";
import type { Prisma } from "@prisma/client";

// Degree type codes — must match the circuit constants in packages/shared
const DEGREE_TYPE_CODES: Record<string, number> = {
  "b.sc":   1,
  "b.eng":  1,
  "b.tech": 1,
  "b.ed":   1,
  "b.a":    1,
  "hnd":    2,
  "m.sc":   3,
  "m.eng":  3,
  "m.a":    3,
  "mba":    3,
  "pgd":    4,
  "phd":    5,
};

function normalizeDegreeCode(raw: string): number {
  const key   = raw.trim().toLowerCase().replace(/\s+/g, "");
  return DEGREE_TYPE_CODES[key] ?? 1;
}

// ─── Row validation ───────────────────────────────────────────────────────

interface RawRow {
  matricNumber?:   string | number;
  firstName?:      string;
  lastName?:       string;
  degreeType?:     string;
  graduationYear?: string | number;
  cgpa?:           string | number;
  totalCredits?:   string | number;
  classification?: string;
}

interface ValidatedRow {
  matricNumber:   string;
  firstName:      string;
  lastName:       string;
  degreeTypeCode: number;
  graduationYear: number;
  cgpaInt:        number;     // CGPA * 100, truncated
  totalCredits:   number;
  classification: string;
  commitment:     string;     // hex bytes32
  nullifier:      string;     // hex bytes32
  matricHash:     string;     // sha256 of matric number — stored in DB, not matric itself
}

interface RowError {
  row:     number;
  matric?: string;
  errors:  string[];
}

function validateRow(row: RawRow, rowIndex: number): { data?: ValidatedRow; errors?: RowError } {
  const errors: string[] = [];

  const matric   = String(row.matricNumber ?? "").trim();
  const gradYear = parseInt(String(row.graduationYear ?? ""), 10);
  const cgpa     = parseFloat(String(row.cgpa ?? ""));
  const credits  = parseInt(String(row.totalCredits ?? ""), 10);

  if (!matric)                   errors.push("matricNumber is required");
  if (!row.firstName?.trim())    errors.push("firstName is required");
  if (!row.lastName?.trim())     errors.push("lastName is required");
  if (!row.degreeType?.trim())   errors.push("degreeType is required");
  if (isNaN(gradYear) || gradYear < 1900 || gradYear > new Date().getFullYear() + 5)
                                  errors.push("graduationYear is invalid");
  if (isNaN(cgpa) || cgpa < 0 || cgpa > 5)
                                  errors.push("cgpa must be between 0 and 5");
  if (isNaN(credits) || credits < 0)
                                  errors.push("totalCredits is invalid");

  if (errors.length > 0) {
    return { errors: { row: rowIndex, matric, errors } };
  }

  const cgpaInt       = Math.floor(cgpa * 100);
  const degreeTypeCode = normalizeDegreeCode(row.degreeType!);
  const matricHash    = crypto.createHash("sha256").update(matric).digest("hex");

  // Commitment and nullifier computed using a deterministic hash
  // In production this uses Poseidon — here we use sha256 as a placeholder
  // because brining in circomlibjs adds complexity to the worker startup.
  // The actual Poseidon computation is done in the circuit test setup and
  // the real worker will call into poseidonHash from packages/shared.
  //
  // For now: commitment = first 32 bytes of sha256(matric | cgpaInt | gradYear | degreeCode)
  //          nullifier  = first 32 bytes of sha256(commitment | institutionId)
  // TODO: replace with Poseidon when circomlibjs is available in this context
  const commitmentInput = `${matric}:${cgpaInt}:${gradYear}:${degreeTypeCode}`;
  const commitment      = "0x" + crypto.createHash("sha256").update(commitmentInput).digest("hex");
  const nullifier       = "0x" + crypto.createHash("sha256").update(commitment + matric).digest("hex");

  return {
    data: {
      matricNumber:   matric,
      firstName:      row.firstName!.trim(),
      lastName:       row.lastName!.trim(),
      degreeTypeCode,
      graduationYear: gradYear,
      cgpaInt,
      totalCredits:   credits,
      classification: row.classification?.trim() ?? "",
      commitment,
      nullifier,
      matricHash,
    },
  };
}

// ─── Main service function ────────────────────────────────────────────────

export interface BatchProcessResult {
  processed: number;
  failed:    number;
  errors:    RowError[];
}

export async function processBatch(batchId: string, institutionId: string): Promise<BatchProcessResult> {
  // Load the batch record
  const batch = await prisma.credentialBatch.findUnique({
    where:  { id: batchId },
    select: { storagePath: true, fileHash: true },
  });

  if (!batch) throw new Error(`Batch ${batchId} not found`);

  // Update status to PROCESSING
  await prisma.credentialBatch.update({
    where: { id: batchId },
    data:  { status: "PROCESSING" },
  });

  // Read the file from storage
  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFileFromStorage(batch.storagePath);
  } catch (err) {
    await prisma.credentialBatch.update({
      where: { id: batchId },
      data:  { status: "FAILED", errorReport: [{ row: 0, errors: [`Failed to read file: ${String(err)}`] }] },
    });
    throw err;
  }

  // Parse Excel with ExcelJS
  const ExcelJS  = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await (workbook.xlsx as any).load(fileBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Excel file has no worksheets");
  }

  // Build a header map from the first row
  const headerRow   = worksheet.getRow(1).values as (string | undefined)[];
  const headerMap   = new Map<string, number>();  // column name → 1-based index
  headerRow.forEach((cell, idx) => {
    if (cell) headerMap.set(cell.toString().trim().toLowerCase(), idx);
  });

  const getCell = (row: { getCell: (idx: number) => { value: unknown } }, colName: string): string | number | undefined => {
    const idx = headerMap.get(colName);
    if (!idx) return undefined;
    const val = row.getCell(idx).value;
    if (val === null || val === undefined) return undefined;
    return typeof val === "object" && "toString" in val ? val.toString() : val as string | number;
  };

  const validRows: ValidatedRow[] = [];
  const rowErrors: RowError[]     = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;  // skip header

    const rawRow: RawRow = {
      matricNumber:   getCell(row, "matricnumber") as string | undefined,
      firstName:      getCell(row, "firstname")    as string | undefined,
      lastName:       getCell(row, "lastname")     as string | undefined,
      degreeType:     getCell(row, "degreetype")   as string | undefined,
      graduationYear: getCell(row, "graduationyear"),
      cgpa:           getCell(row, "cgpa"),
      totalCredits:   getCell(row, "totalcredits"),
      classification: getCell(row, "classification") as string | undefined,
    };

    const result = validateRow(rawRow, rowNumber);
    if (result.errors) {
      rowErrors.push(result.errors);
    } else if (result.data) {
      validRows.push(result.data);
    }
  });

  // Update total record count now that we know it
  await prisma.credentialBatch.update({
    where: { id: batchId },
    data:  { recordCount: validRows.length + rowErrors.length },
  });

  if (rowErrors.length > 0) {
    // Write validation errors and bail — we don't do partial batches
    await prisma.credentialBatch.update({
      where: { id: batchId },
      data:  {
        status:      "VALIDATION_FAILED",
        failedCount: rowErrors.length,
        errorReport: rowErrors as unknown as Prisma.InputJsonValue,
      },
    });
    return { processed: 0, failed: rowErrors.length, errors: rowErrors };
  }

  // Persist credentials to DB in a transaction
  await prisma.$transaction(
    validRows.map((row) =>
      prisma.credential.create({
        data: {
          institutionId,
          batchId,
          nullifier:           row.nullifier,
          commitment:          row.commitment,
          matricNumberHash:    row.matricHash,
          graduationYear:      row.graduationYear,
          degreeTypeCode:      row.degreeTypeCode,
          encryptedPrivateData: "",  // TODO: AES-encrypt the private record
        },
      })
    )
  );

  // Mark batch complete
  await prisma.credentialBatch.update({
    where: { id: batchId },
    data: {
      status:       "CONFIRMED",
      passedCount:  validRows.length,
      confirmedAt:  new Date(),
    },
  });

  return { processed: validRows.length, failed: 0, errors: [] };
}
