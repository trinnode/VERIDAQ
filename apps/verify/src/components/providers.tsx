"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

let browserQueryClient: QueryClient | undefined;

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  });
}

function getQueryClient() {
  if (typeof window === "undefined") return makeClient();
  if (!browserQueryClient) browserQueryClient = makeClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const qc = getQueryClient();
  return (
    <QueryClientProvider client={qc}>
      {children}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          duration: 4000,
          classNames: {
            error: "!duration-[120000]",
            warning: "!duration-6000",
          },
        }}
      />
    </QueryClientProvider>
  );
}
