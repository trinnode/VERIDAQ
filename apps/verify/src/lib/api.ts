const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface Employer {
  id: string;
  companyName: string;
  email: string;
  contactEmail?: string;
  contactName: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  kycStatus: string;
  subscriptionTier: string;
  freeVerificationsUsed: number;
  freeVerificationsLimit: number;
  isActive: boolean;
}

export interface Institution {
  id: string;
  slugId: string;
  name: string;
  claimCount: number;
}

export interface ClaimDefinition {
  id: string;
  claimCode: string;
  claimLabel: string;
  claimType: "AUTO" | "MANUAL";
  description?: string;
  isActive: boolean;
}

export interface VerificationRequest {
  id: string;
  status: string;
  claimCode: string;
  claimLabel?: string;
  institutionId: string;
  institutionName?: string;
  result?: boolean | null;
  proofReference?: string;
  graduationYear?: number;
  requestedAt: string;
  resolvedAt?: string | null;
  referenceNumber?: string;
  declineReason?: string;
}

export interface SubmitVerificationInput {
  institutionId: string;
  matricNumber: string;
  claimCode: string;
  customClaimText?: string;
}

let _token: string | null = null;

export function setVerifyToken(t: string | null) {
  _token = t;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    let msg = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      msg = body.message ?? body.error ?? msg;
    } catch {
      // ignore
    }
    throw new ApiError(msg, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const employerApi = {
  request,

  login: (email: string, password: string) =>
    request<{ token: string; employer: Employer }>("/v1/auth/employer/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<void>("/v1/auth/logout", { method: "POST" }),

  getProfile: () =>
    request<{ employer: Employer; freeVerificationsRemaining: number }>("/v1/employer/profile"),

  getInstitutions: () =>
    request<Institution[]>("/v1/employer/institutions"),

  getInstitutionClaims: (institutionId: string) =>
    request<ClaimDefinition[]>(`/v1/employer/institutions/${institutionId}/claims`),

  submitVerification: (input: SubmitVerificationInput) =>
    request<VerificationRequest>("/v1/employer/verify", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getVerifications: () =>
    request<VerificationRequest[]>("/v1/employer/verifications"),

  getVerification: (id: string) =>
    request<VerificationRequest>(`/v1/employer/verifications/${id}`),

  downloadReport: async (id: string) => {
    const res = await fetch(`${API_BASE}/v1/employer/verifications/${id}/report`, {
      headers: _token ? { Authorization: `Bearer ${_token}` } : {},
      credentials: "include",
    });
    if (!res.ok) throw new ApiError("Report download failed", res.status);
    return res.blob();
  },

  register: (data: {
    companyName: string;
    cacNumber: string;
    websiteUrl?: string;
    contactName: string;
    contactNin: string;
    contactEmail: string;
    password: string;
    cacDocumentUrl?: string;
    contactIdUrl?: string;
    acceptedTerms: boolean;
  }) =>
    request<{ message: string }>("/v1/auth/employer/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
