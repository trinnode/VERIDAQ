// one flat store for the institution portal
// keeps things like the auth token, session info, and any transient UI state

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Institution } from "@/lib/api";

interface PortalState {
  token: string | null;
  institution: Institution | null;

  // set after a successful login
  setSession: (token: string, institution: Institution) => void;

  // clear everything and go back to logged-out state
  clearSession: () => void;

  // update just the institution profile in state
  // useful after a PATCH /profile without doing a full login again
  updateInstitution: (data: Partial<Institution>) => void;
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set) => ({
      token: null,
      institution: null,

      setSession: (token, institution) => set({ token, institution }),

      clearSession: () => set({ token: null, institution: null }),

      updateInstitution: (data) =>
        set((s) => ({
          institution: s.institution ? { ...s.institution, ...data } : null,
        })),
    }),
    {
      name: "veridaq-portal-session",
      // only persist the token and institution, not the action functions
      partialize: (s) => ({ token: s.token, institution: s.institution }),
    }
  )
);
