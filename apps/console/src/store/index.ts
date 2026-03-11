import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Admin } from "@/lib/api";
import { setAdminToken } from "@/lib/api";

interface ConsoleStore {
  token: string | null;
  admin: Admin | null;
  setSession: (token: string, admin: Admin) => void;
  clearSession: () => void;
  updateAdmin: (admin: Partial<Admin>) => void;
}

export const useConsoleStore = create<ConsoleStore>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,

      setSession: (token, admin) => {
        setAdminToken(token);
        set({ token, admin });
      },

      clearSession: () => {
        setAdminToken(null);
        set({ token: null, admin: null });
      },

      updateAdmin: (updates) => {
        const current = get().admin;
        if (current) {
          set({ admin: { ...current, ...updates } });
        }
      },
    }),
    {
      name: "veridaq-console-session",
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAdminToken(state.token);
        }
      },
    }
  )
);
