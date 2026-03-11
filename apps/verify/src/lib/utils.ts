import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ApiError } from "./api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM d, yyyy, h:mm a");
  } catch {
    return "—";
  }
}

export function verificationStatusLabel(status: string): {
  label: string;
  variant: "success" | "warning" | "pending" | "danger" | "muted";
} {
  switch (status) {
    case "COMPLETED":
    case "APPROVED":
    case "VERIFIED":
      return { label: "Verified", variant: "success" };
    case "DECLINED":
    case "REJECTED":
    case "NOT_VERIFIED":
      return { label: "Not Verified", variant: "danger" };
    case "RECORD_NOT_FOUND":
      return { label: "Not Found", variant: "danger" };
    case "REVOKED":
      return { label: "Revoked", variant: "danger" };
    case "AWAITING_INSTITUTION":
      return { label: "Awaiting Institution", variant: "warning" };
    case "AUTO_PROCESSING":
      return { label: "Processing", variant: "pending" };
    default:
      return { label: status, variant: "muted" };
  }
}
