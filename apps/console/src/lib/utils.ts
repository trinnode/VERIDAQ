import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type KycStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";

export function kycStatusLabel(status: KycStatus): { label: string; variant: "success" | "danger" | "warning" | "muted" | "pending" } {
  switch (status) {
    case "APPROVED": return { label: "Approved", variant: "success" };
    case "SUSPENDED": return { label: "Suspended", variant: "danger" };
    case "REJECTED": return { label: "Rejected", variant: "danger" };
    case "PENDING": return { label: "Pending Review", variant: "warning" };
    default: return { label: status, variant: "muted" };
  }
}
