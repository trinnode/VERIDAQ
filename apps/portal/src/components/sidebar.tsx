"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  FileStack,
  FileBadge2,
  ShieldCheck,
  ScrollText,
  CreditCard,
  Settings,
  LogOut,
  ShieldCheck as Logo,
  Menu,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortalStore } from "@/store";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Credentials", icon: Upload },
  { href: "/batches", label: "Batches", icon: FileStack },
  { href: "/claims", label: "Claims", icon: FileBadge2 },
  { href: "/verifications", label: "Verifications", icon: ShieldCheck },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: (v: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, institution, clearSession } = usePortalStore();

  async function handleLogout() {
    try {
      if (token) {
        await api.logout(token);
      }
    } catch {
      // ignore
    }
    clearSession();
    toast.success("Signed out successfully");
    router.push("/login");
  }

  const initials = institution?.name
    ? institution.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "IN";

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-navy text-white transition-all duration-300 ease-in-out shrink-0",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-white/10 gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 shrink-0">
          <Logo className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight truncate">VERIDAQ</span>
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        <TooltipProvider delayDuration={0}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Tooltip key={href} disableHoverableContent={!collapsed}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    <p>{label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* Footer / user */}
      <div className="border-t border-white/10 p-3">
        <TooltipProvider delayDuration={0}>
          <Tooltip disableHoverableContent={!collapsed}>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-white truncate">
                        {institution?.name ?? "Institution"}
                      </p>
                      <p className="text-xs text-white/50 truncate">Sign out</p>
                    </div>
                    <LogOut className="w-4 h-4 shrink-0 text-white/50" />
                  </>
                )}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                <p>Sign out</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
}
