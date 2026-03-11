"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  HeartPulse,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminApi } from "@/lib/api";
import { useConsoleStore } from "@/store";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/institutions", label: "Institutions", icon: Building2 },
  { href: "/employers", label: "Employers", icon: Users },
  { href: "/audit", label: "Audit Log", icon: FileText },
  { href: "/health", label: "System Health", icon: HeartPulse },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = useConsoleStore((s) => s.admin);
  const clearSession = useConsoleStore((s) => s.clearSession);
  const [collapsed, setCollapsed] = React.useState(false);

  const handleLogout = async () => {
    try {
      await adminApi.logout();
    } catch {
      // ignore logout errors
    }
    clearSession();
    toast.success("Signed out", { duration: 4000 });
    router.replace("/login");
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-navy text-white transition-all duration-200 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-2 px-4 py-5 border-b border-white/10", collapsed && "justify-center px-3")}>
        <ShieldAlert className="w-6 h-6 text-white shrink-0" />
        {!collapsed && (
          <span className="font-bold text-sm tracking-wide text-white">VERIDAQ</span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white",
                collapsed && "justify-center"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Admin info + logout */}
      <div className="border-t border-white/10 p-3 space-y-1">
        {!collapsed && admin && (
          <div className="px-2 py-1.5">
            <p className="text-xs font-semibold text-white truncate">{admin.name}</p>
            <p className="text-xs text-white/50 truncate">{admin.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-white/60 hover:bg-white/8 hover:text-white transition-colors",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center py-3 border-t border-white/10 text-white/40 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
