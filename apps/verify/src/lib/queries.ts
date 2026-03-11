import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employerApi } from "@/lib/api";

export function useProfile() {
  return useQuery({
    queryKey: ["employer", "profile"],
    queryFn: () => employerApi.getProfile(),
    staleTime: 60_000,
  });
}

export function useInstitutions() {
  return useQuery({
    queryKey: ["institutions"],
    queryFn: () => employerApi.getInstitutions(),
    staleTime: 5 * 60_000,
  });
}

export function useInstitutionClaims(institutionId: string | null) {
  return useQuery({
    queryKey: ["institution-claims", institutionId],
    queryFn: () => employerApi.getInstitutionClaims(institutionId!),
    enabled: !!institutionId,
    staleTime: 3 * 60_000,
  });
}

export function useVerifications() {
  return useQuery({
    queryKey: ["verifications"],
    queryFn: () => employerApi.getVerifications(),
    staleTime: 30_000,
  });
}

export function useVerification(id: string | null) {
  return useQuery({
    queryKey: ["verification", id],
    queryFn: () => employerApi.getVerification(id!),
    enabled: !!id,
    // Poll while pending
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (["AUTO_PROCESSING", "AWAITING_INSTITUTION"].includes(status ?? "")) return 5000;
      return false;
    },
  });
}

export function useSubmitVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: employerApi.submitVerification,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verifications"] });
      qc.invalidateQueries({ queryKey: ["employer", "profile"] });
    },
  });
}
