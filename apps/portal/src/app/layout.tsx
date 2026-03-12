import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ScrollProgress } from "@/components/scroll-progress";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "VERIDAQ | Institution Portal",
  description: "Manage credential issuance, claims, and verifications for your institution.",
  keywords: ["veridaq", "institution", "portal", "credentials", "upload"],
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ScrollProgress />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
