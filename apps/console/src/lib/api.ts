import { ApiError } from "./utils";

const API_BASE = "/api";
const SESSION_COOKIE = "veridaq_admin_token";

export { SESSION_COOKIE };

let _token: string | null = null;

export function setAdminToken(token: string | null) {
  _token = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Admin {
  id: string;
  email: string;
  name: string;
}

export interface Institution {
  id: string;
  name: string;
  email: string;
  nucAccreditationNumber: string;
  cacRegistrationNumber?: string;
  contactName: string;
  officialEmailDomain: string;
  signingWalletAddress?: string;
  kycStatus: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
  subscriptionTier: string;
  credentialCount: number;
  verificationCount: number;
  paymasterBalance: string;
  registeredAt: string;
  documents?: Array<{ id: string; fileName: string; url: string; type: string }>;
  kycNotes?: string;
  rejectionReason?: string;
}

export interface Employer {
  id: string;
  companyName: string;
  email: string;
  contactName: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  kycStatus: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
  subscriptionTier: string;
  freeVerificationsRemaining: number;
  verificationCount: number;
  registeredAt: string;
  documents?: Array<{ id: string; fileName: string; url: string; type: string }>;
  kycNotes?: string;
  rejectionReason?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorType: "INSTITUTION" | "EMPLOYER" | "ADMIN";
  actorId: string;
  actorName: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface SystemHealth {
  blockchain: {
    lastBlock: number;
    networkName: string;
    status: "ok" | "degraded" | "down";
    latencyMs: number;
  };
  paymaster: {
    totalSponsoredBalance: string;
    institutionsBelow: Array<{ id: string; name: string; balance: string }>;
  };
  queues: Array<{
    name: string;
    waiting: number;
    active: number;
    failed: number;
    completed: number;
    lastSuccessAt?: string;
  }>;
  api: {
    requestsLastHour: number;
    errorRate: number;
    p95ResponseMs: number;
  };
  database: {
    connectionPoolSize: number;
    activeConnections: number;
    slowQueryCount: number;
    status: "ok" | "degraded";
  };
}

export interface DashboardStats {
  totalInstitutions: number;
  pendingInstitutionKyc: number;
  totalEmployers: number;
  pendingEmployerKyc: number;
  totalVerifications: number;
  verificationsToday: number;
  totalCredentialsIssued: number;
  totalActiveInstitutions: number;
}

// ─── API methods ─────────────────────────────────────────────────────────────

export const adminApi = {
  request,

  login: async (email: string, password: string) => {
    const res = await request<{ token: string; actor: { id: string; name: string; role: string } }>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, actorType: "ADMIN" }),
    });
    return { token: res.token, admin: { id: res.actor.id, email, name: res.actor.name } as Admin };
  },

  logout: () =>
    request<void>("/v1/auth/logout", { method: "POST" }),

  getProfile: async () => {
    // Admin profile is derived from the JWT — no separate endpoint
    return { admin: null };
  },

  getDashboardStats: () =>
    request<DashboardStats>("/v1/admin/stats"),

  // Institutions
  getInstitutions: (params?: { status?: string; page?: number; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.q) qs.set("q", params.q);
    return request<{ institutions: Institution[]; total: number }>(
      `/v1/admin/institutions?${qs.toString()}`
    );
  },

  getInstitution: (id: string) =>
    request<{ institution: Institution }>(`/v1/admin/institutions/${id}`),

  approveInstitution: (id: string) =>
    request<void>(`/v1/admin/institutions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ kycStatus: "APPROVED" }),
    }),

  suspendInstitution: (id: string, reason: string) =>
    request<void>(`/v1/admin/institutions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ kycStatus: "SUSPENDED" }),
    }),

  rejectInstitution: (id: string, reason: string) =>
    request<void>(`/v1/admin/institutions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ kycStatus: "REJECTED" }),
    }),

  deactivateInstitution: (id: string) =>
    request<void>(`/v1/admin/institutions/${id}/deactivate`, { method: "PATCH" }),

  reactivateInstitution: (id: string) =>
    request<void>(`/v1/admin/institutions/${id}/reactivate`, { method: "PATCH" }),

  // Employers
  getEmployers: (params?: { status?: string; page?: number; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("kycStatus", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.q) qs.set("q", params.q);
    return request<{ employers: Employer[]; total: number }>(
      `/v1/admin/employers?${qs.toString()}`
    );
  },

  getEmployer: (id: string) =>
    request<{ employer: Employer }>(`/v1/admin/employers/${id}`),

  approveEmployer: (id: string) =>
    request<void>(`/v1/admin/employers/${id}/kyc`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "APPROVED" }),
    }),

  suspendEmployer: (id: string, reason: string) =>
    request<void>(`/v1/admin/employers/${id}/kyc`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "REJECTED", notes: reason }),
    }),

  rejectEmployer: (id: string, reason: string) =>
    request<void>(`/v1/admin/employers/${id}/kyc`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "REJECTED", notes: reason }),
    }),

  // Audit
  getAuditLogs: (params?: { actorType?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.actorType) qs.set("actorId", params.actorType);
    if (params?.page) qs.set("page", String(params.page));
    return request<{ logs: AuditLogEntry[]; total: number }>(
      `/v1/admin/audit-logs?${qs.toString()}`
    );
  },

  // Health
  getHealth: () => request<SystemHealth>("/v1/admin/health"),

  // Billing
  getSponsoredPoolBalance: () =>
    request<{ balance: string; currency: string }>("/v1/admin/billing/sponsored-pool"),

  depositToSponsoredPool: (amount: string) =>
    request<void>("/admin/billing/sponsored-pool/deposit", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
};
