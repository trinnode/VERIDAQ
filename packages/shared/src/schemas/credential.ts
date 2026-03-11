import { z } from "zod";
import { CLASSIFICATION_CODES, CGPA_MAX_SCALED, CGPA_SCALE_FACTOR } from "../constants/claim";

/**
 * One row from the institution's Excel upload.
 * All fields come in as raw strings from the spreadsheet; we coerce and validate here.
 *
 * The institution enters human-readable values (e.g. "4.50" for CGPA, "Upper Second" for class).
 * We convert to the internal integer representations here.
 */
export const ExcelCredentialRowSchema = z.object({
  matricNumber:   z.string().min(3, "matric number cannot be blank"),
  studentName:    z.string().min(2, "student name cannot be blank"),
  cgpa: z
    .string()
    .transform((val) => {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) throw new Error("CGPA must be a number");
      return Math.round(parsed * CGPA_SCALE_FACTOR);
    })
    .pipe(
      z.number()
        .int()
        .min(0, "CGPA cannot be negative")
        .max(CGPA_MAX_SCALED, "CGPA cannot exceed 5.00")
    ),
  classification: z
    .string()
    .toLowerCase()
    .transform((val) => {
      const map: Record<string, number> = {
        "third class":   CLASSIFICATION_CODES.THIRD_CLASS,
        "third":         CLASSIFICATION_CODES.THIRD_CLASS,
        "lower second":  CLASSIFICATION_CODES.LOWER_SECOND,
        "2.2":           CLASSIFICATION_CODES.LOWER_SECOND,
        "upper second":  CLASSIFICATION_CODES.UPPER_SECOND,
        "2.1":           CLASSIFICATION_CODES.UPPER_SECOND,
        "first class":   CLASSIFICATION_CODES.FIRST_CLASS,
        "first":         CLASSIFICATION_CODES.FIRST_CLASS,
        "1st":           CLASSIFICATION_CODES.FIRST_CLASS,
      };
      const code = map[val.trim()];
      if (code === undefined) throw new Error(`unknown classification: "${val}"`);
      return code;
    }),
  courseOfStudy:  z.string().min(2, "course of study cannot be blank"),
  graduationYear: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(
      z.number()
        .int()
        .min(1900, "graduation year is out of range")
        .max(new Date().getFullYear() + 1, "graduation year cannot be in the future")
    ),
});

export type ExcelCredentialRow = z.infer<typeof ExcelCredentialRowSchema>;

/**
 * The full batch upload body after the file is parsed.
 * All rows must pass validation before any row is processed.
 */
export const CredentialBatchSchema = z.object({
  institutionId: z.string().min(1),
  rows:          z.array(ExcelCredentialRowSchema).min(1, "batch cannot be empty"),
});

export type CredentialBatch = z.infer<typeof CredentialBatchSchema>;

/**
 * What the API returns when validation fails: per-row errors with the row number and what went wrong.
 */
export interface RowValidationError {
  rowNumber: number;
  field:     string;
  message:   string;
  rawValue:  string;
}

export interface BatchValidationResult {
  valid:   boolean;
  total:   number;
  errors:  RowValidationError[];
}
