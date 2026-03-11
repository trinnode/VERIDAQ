import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";

export function useAdminProfile() {
  return useQuery({
    queryKey: ["admin", "profile"],
    queryFn: () => adminApi.getProfile(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminApi.getDashboardStats(),
    refetchInterval: 30 * 1000,
  });
}

export function useInstitutions(params?: { status?: string; page?: number; q?: string }) {
  return useQuery({
    queryKey: ["admin", "institutions", params],
    queryFn: () => adminApi.getInstitutions(params),
    staleTime: 15 * 1000,
  });
}

export function useInstitution(id: string) {
  return useQuery({
    queryKey: ["admin", "institutions", id],
    queryFn: () => adminApi.getInstitution(id),
    enabled: !!id,
  });
}

export function useApproveInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.approveInstitution(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "institutions"] });
    },
  });
}

export function useSuspendInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.suspendInstitution(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "institutions"] });
    },
  });
}

export function useRejectInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectInstitution(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "institutions"] });
    },
  });
}

export function useEmployers(params?: { status?: string; page?: number; q?: string }) {
  return useQuery({
    queryKey: ["admin", "employers", params],
    queryFn: () => adminApi.getEmployers(params),
    staleTime: 15 * 1000,
  });
}

export function useEmployer(id: string) {
  return useQuery({
    queryKey: ["admin", "employers", id],
    queryFn: () => adminApi.getEmployer(id),
    enabled: !!id,
  });
}

export function useApproveEmployer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.approveEmployer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "employers"] });
    },
  });
}

export function useSuspendEmployer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.suspendEmployer(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "employers"] });
    },
  });
}

export function useRejectEmployer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectEmployer(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "employers"] });
    },
  });
}

export function useAuditLogs(params?: { actorType?: string; page?: number }) {
  return useQuery({
    queryKey: ["admin", "audit", params],
    queryFn: () => adminApi.getAuditLogs(params),
    staleTime: 15 * 1000,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => adminApi.getHealth(),
    refetchInterval: 20 * 1000,
  });
}

export function useSponsoredPoolBalance() {
  return useQuery({
    queryKey: ["admin", "billing", "sponsored-pool"],
    queryFn: () => adminApi.getSponsoredPoolBalance(),
    refetchInterval: 60 * 1000,
  });
}
