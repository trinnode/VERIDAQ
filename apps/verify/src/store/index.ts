"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Employer } from "@/lib/api";
import { setVerifyToken } from "@/lib/api";

interface VerifyStore {
  token: string | null;
  employer: Employer | null;
  setSession: (token: string, employer: Employer) => void;
  clearSession: () => void;
  updateEmployer: (data: Partial<Employer>) => void;
}

export const useVerifyStore = create<VerifyStore>()(
  persist(
    (set) => ({
      token: null,
      employer: null,

      setSession: (token, employer) => {
        setVerifyToken(token);
        set({ token, employer });
      },

      clearSession: () => {
        setVerifyToken(null);
        set({ token: null, employer: null });
      },

      updateEmployer: (data) =>
        set((state) => ({
          employer: state.employer ? { ...state.employer, ...data } : null,
        })),
    }),
    {
      name: "veridaq-verify-session",
      partialize: (state) => ({ token: state.token, employer: state.employer }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setVerifyToken(state.token);
      },
    }
  )
);
