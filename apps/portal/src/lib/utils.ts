import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// just the standard shadcn cn helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// format a date into something a human would actually read
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof date === "string" ? new Date(date) : date);
}

// same but without the time part
export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

// convert a file size in bytes to "1.2 MB" style
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// turn a batch status code into the label the user should see
export function batchStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    QUEUED: "Queued",
    PROCESSING: "Processing",
    SUBMITTING: "Submitting to chain",
    CONFIRMED: "Confirmed",
    FAILED: "Failed",
    PARTIAL_FAILURE: "Partial failure",
  };
  return labels[status] ?? status;
}

// same idea for verification request status
export function verificationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Pending",
    AUTO_PROCESSING: "Auto processing",
    AWAITING_INSTITUTION: "Awaiting review",
    COMPLETED: "Completed",
    DECLINED: "Declined",
    RECORD_NOT_FOUND: "Record not found",
    REVOKED: "Revoked",
  };
  return labels[status] ?? status;
}

// truncate a long hash or address so it fits comfortably in a table cell
export function truncateHash(hash: string, chars = 8): string {
  if (!hash) return "";
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

// pull a human-readable error message out of whatever shape the API returned
export function apiErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
    if (typeof e.error === "string") return e.error;
  }
  return "Something went wrong. Try again.";
}
