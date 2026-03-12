import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ScrollProgress } from "@/components/scroll-progress";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "VERIDAQ | Employer Verification Portal",
  description: "Submit and track academic credential verification requests.",
  keywords: ["veridaq", "employer", "verification", "credentials"],
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
