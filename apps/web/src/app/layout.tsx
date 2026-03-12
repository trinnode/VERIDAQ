import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ScrollProgress } from "@/components/scroll-progress";
import "./globals.css";

export const metadata: Metadata = {
  title: "VERIDAQ — Verified Academic Credentials",
  description:
    "Privacy-preserving academic credential verification using zero-knowledge proofs on-chain. Trusted by institutions, employers, and individuals.",
  keywords: ["credentials", "verification", "blockchain", "zero-knowledge", "academic"],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "VERIDAQ",
    description:
      "Privacy-preserving academic credential verification using zero-knowledge proofs.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ScrollProgress />
        {children}
      </body>
    </html>
  );
}
