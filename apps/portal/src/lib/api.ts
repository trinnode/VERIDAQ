// typed fetch wrapper for the VERIDAQ backend
// all requests go through here so auth headers are always set

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {
      // body wasn't JSON, use the status text
    }
    throw new ApiError(res.status, message);
  }

  // 204 No Content has no body
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// the actual API methods we call from components and query hooks

export const api = {
  request,

  // auth
  loginInstitution: (email: string, password: string) =>
    request<{ token: string; institution: Institution }>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role: "INSTITUTION" }),
    }),

  logout: (token: string) =>
    request<void>("/v1/auth/logout", {
      method: "POST",
      token,
    }),

  // institution profile
  getProfile: (token: string) =>
    request<Institution>("/v1/institutions/profile", { token }),

  updateProfile: (token: string, data: Partial<Institution>) =>
    request<Institution>("/v1/institutions/profile", {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  // batches
  getBatches: (token: string) =>
    request<CredentialBatch[]>("/v1/institutions/batches", { token }),

  getBatch: (token: string, batchId: string) =>
    request<CredentialBatch>(`/v1/institutions/batches/${batchId}`, { token }),

  downloadTemplate: (token: string) =>
    fetch(`${API_BASE}/v1/institutions/upload/template`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  // upload a file — can't use JSON for this one
  uploadBatch: async (token: string, file: File): Promise<{ batchId: string }> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/v1/institutions/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.message ?? "Upload failed");
    }
    return res.json();
  },

  // claims
  getClaims: (token: string) =>
    request<ClaimDefinition[]>("/v1/institutions/claims", { token }),

  createClaim: (token: string, data: CreateClaimInput) =>
    request<ClaimDefinition>("/v1/institutions/claims", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  updateClaim: (token: string, claimId: string, data: Partial<CreateClaimInput>) =>
    request<ClaimDefinition>(`/v1/institutions/claims/${claimId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  deleteClaim: (token: string, claimId: string) =>
    request<void>(`/v1/institutions/claims/${claimId}`, {
      method: "DELETE",
      token,
    }),

  // verifications
  getVerifications: (token: string, params?: VerificationListParams) => {
    const q = new URLSearchParams(params as Record<string, string> ?? {}).toString();
    return request<VerificationRequest[]>(
      `/v1/institutions/verifications${q ? `?${q}` : ""}`,
      { token }
    );
  },

  approveVerification: (token: string, requestId: string) =>
    request<void>(`/v1/institutions/verifications/${requestId}/approve`, {
      method: "PATCH",
      token,
    }),

  declineVerification: (token: string, requestId: string, reason: string) =>
    request<void>(`/v1/institutions/verifications/${requestId}/decline`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ reason }),
    }),

  // audit logs
  getAuditLogs: (token: string, params?: AuditLogParams) => {
    const q = new URLSearchParams(params as Record<string, string> ?? {}).toString();
    return request<AuditLogEntry[]>(
      `/v1/institutions/audit${q ? `?${q}` : ""}`,
      { token }
    );
  },

  // paymaster balance
  getPaymasterBalance: (token: string) =>
    request<{ balanceMatic: string; balanceWei: string }>(
      "/v1/institutions/paymaster/balance",
      { token }
    ),

  // revoke a credential
  revokeCredential: (token: string, matricNumberHash: string, reasonCode: number) =>
    request<void>("/v1/institutions/revoke", {
      method: "POST",
      token,
      body: JSON.stringify({ matricNumberHash, reasonCode }),
    }),

  // dashboard stats — GET /v1/institutions/stats
  getDashboardStats: (token: string) =>
    request<DashboardStats>("/v1/institutions/stats", { token }),
};

// types used across components and query hooks

export interface Institution {
  id: string;
  slugId: string;
  name: string;
  email: string;
  subscriptionTier: "FREE" | "PAID";
  kycStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "FLAGGED";
  isActive: boolean;
  countryCode?: string;
  contactPhone?: string;
  websiteUrl?: string;
  addressLine?: string;
  state?: string;
  logoUrl?: string;
  adminWalletAddress?: string;
  onChainId?: string;
  createdAt: string;
}

export interface CredentialBatch {
  id: string;
  institutionId: string;
  uploadedByEmail: string;
  fileHash?: string;
  storagePath: string;
  recordCount: number;
  passedCount: number;
  failedCount: number;
  onChainTxHash?: string;
  status: "QUEUED" | "PROCESSING" | "SUBMITTING" | "CONFIRMED" | "FAILED" | "PARTIAL_FAILURE";
  errorReport?: ValidationError[];
  createdAt: string;
  confirmedAt?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ClaimDefinition {
  id: string;
  institutionId: string;
  claimCode: string;
  claimLabel: string;
  claimType: "AUTO" | "MANUAL";
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateClaimInput {
  claimLabel: string;
  claimType: "AUTO" | "MANUAL";
  description?: string;
}

export interface VerificationRequest {
  id: string;
  employerId: string;
  institutionId: string;
  matricNumberHash: string;
  claimCode: string;
  status: "PENDING" | "AUTO_PROCESSING" | "AWAITING_INSTITUTION" | "COMPLETED" | "DECLINED" | "RECORD_NOT_FOUND" | "REVOKED";
  resultProof?: string;
  requestedAt: string;
  resolvedAt?: string;
  employer?: {
    id: string;
    companyName: string;
    contactEmail: string;
  };
}

export interface AuditLogEntry {
  id: string;
  actorType: string;
  actorIdHash: string;
  actionType: string;
  resourceType: string;
  resourceId: string;
  outcome: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface DashboardStats {
  totalBatches?: number;
  totalCredentials: number;
  verificationsThisMonth: number;
  pendingVerifications: number;
  verifiedCount?: number;
  declinedCount?: number;
  failedBatches?: number;
  paymasterBalanceMatic: string;
  subscriptionTier: "FREE" | "PAID";
  lastBatch?: {
    id: string;
    status: string;
    createdAt: string;
    recordCount: number;
  };
}

export interface VerificationListParams {
  status?: string;
  from?: string;
  to?: string;
  employerId?: string;
  claimCode?: string;
  page?: string;
  limit?: string;
}

export interface AuditLogParams {
  from?: string;
  to?: string;
  actionType?: string;
  page?: string;
  limit?: string;
}
