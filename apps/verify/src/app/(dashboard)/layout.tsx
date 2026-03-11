"use client";

import * as React from "react";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
