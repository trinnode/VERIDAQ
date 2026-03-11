// all the react-query hooks the portal uses
// keeping them here means every page gets the same cache keys

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateClaimInput, type VerificationListParams, type AuditLogParams } from "@/lib/api";
import { usePortalStore } from "@/store";

function useToken(): string {
  const token = usePortalStore((s) => s.token);
  if (!token) throw new Error("no session token, user is not logged in");
  return token;
}

// profile
export function useProfile() {
  const token = usePortalStore((s) => s.token);
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api.getProfile(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}

// dashboard stats
export function useDashboardStats() {
  const token = usePortalStore((s) => s.token);
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.getDashboardStats(token!),
    enabled: !!token,
    refetchInterval: 30_000, // poll every 30s so paymaster balance stays fresh
  });
}

// batch list
export function useBatches() {
  const token = usePortalStore((s) => s.token);
  return useQuery({
    queryKey: ["batches"],
    queryFn: () => api.getBatches(token!),
    enabled: !!token,
  });
}

// single batch — used on /batches/[batchId]
export function useBatch(batchId: string) {
  const token = usePortalStore((s) => s.token);
  return useQuery({
    queryKey: ["batch", batchId],
    queryFn: () => api.getBatch(token!, batchId),
    enabled: !!token && !!batchId,
    // while a batch is still processing, keep polling for updates
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && ["QUEUED", "PROCESSING", "SUBMITTING"].includes(status)) {
        return 5_000;
      }
      return false;
    },
  });
}

// claims
export function useClaims() {
  const token = usePortalStore((s) => s.token);
  return useQuery({
    queryKey: ["claims"],
    queryFn: () => api.getClaims(token!),
    enabled: !!token,
  });
}

export function useCreateClaim() {
  const qc = useQueryClient();
  const token = usePortalStore((s) => s.token);
  return useMutation({
    mutationFn: (data: CreateClaimInput) => api.createClaim(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["claims"] }),
  });
}

export function useUpdateClaim() {
  const qc = useQueryClient();
  const token = usePortalStore((s) => s.token);
  return useMutation({
    mutationFn: ({ claimId, data }: { claimId: string; data: Partial<CreateClaimInput> & { isActive?: boolean } }) =>
      api.updateClaim(token!, claimId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["claims"] }),
  });
}

export function useDeleteClaim() {
  const qc = useQueryClient();
  const token = usePortalStore((s) => s.token);
  return useMutation({
    mutationFn: (claimId: string) => api.deleteClaim(token!, claimId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["claims"] }),
  });
}

// verifications
export function useVerifications(params?: VerificationListParams) {
  const token = usePortalStore((s) => s.token);
  return useQuery({
    queryKey: ["verifications", params],
    queryFn: () => api.getVerifications(token!, params),
    enabled: !!token,
  });
}

export function useApproveVerification() {
  const qc = useQueryClient();
  const token = usePortalStore((s) => s.token);
  return useMutation({
    mutationFn: (requestId: string) => api.approveVerification(token!, requestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["verifications"] }),
  });
}

export function useDeclineVerification() {
  const qc = useQueryClient();
  const token = usePortalStore((s) => s.token);
  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      api.declineVerification(token!, requestId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["verifications"] }),
  });
}

// audit logs
export function useAuditLogs(params?: AuditLogParams) {
  const token = usePortalStore((s) => s.token);
  return useQuery({
    queryKey: ["audit", params],
    queryFn: () => api.getAuditLogs(token!, params),
    enabled: !!token,
  });
}

// paymaster balance
export function usePaymasterBalance() {
  const token = usePortalStore((s) => s.token);
  return useQuery({
    queryKey: ["paymaster-balance"],
    queryFn: () => api.getPaymasterBalance(token!),
    enabled: !!token,
    refetchInterval: 60_000,
  });
}

// upload mutation — fires and forgets, returns batchId
export function useUploadBatch() {
  const qc = useQueryClient();
  const token = usePortalStore((s) => s.token);
  return useMutation({
    mutationFn: (file: File) => api.uploadBatch(token!, file),
    onSuccess: () => {
      // refresh batches list after a new upload lands
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
